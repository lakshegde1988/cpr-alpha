import type {
  CPRValues,
  StockData,
  TradingPlan,
  TradingType,
  Bias,
  MarketType,
  Signal,
  DailyCandle,
  FirstDayOverride,
  BiasValidity,
} from '@/types/trading';
import { getOpenVsCPR, getCPRTrend } from './cpr';

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * First-day bias override:
 * On the first trading day of the new period, if price CLOSES above current CPR (TC)
 * → force BULLISH; if it CLOSES below current CPR (BC) → force BEARISH.
 * Price position takes priority over CPR structure on the first day.
 */
function detectFirstDayOverride(
  cpr: CPRValues,
  newPeriodCandles: DailyCandle[],
): { override: FirstDayOverride; date: string | null } {
  if (!newPeriodCandles || newPeriodCandles.length === 0) return { override: null, date: null };
  const firstDay = newPeriodCandles[0];
  if (firstDay.close > cpr.tc) return { override: 'BULLISH', date: firstDay.date };
  if (firstDay.close < cpr.bc) return { override: 'BEARISH', date: firstDay.date };
  return { override: null, date: firstDay.date };
}

/**
 * Bias invalidation: after the first-day override is set, if a subsequent daily close
 * crosses to the opposite side of the CPR, the bias is invalidated.
 */
function detectInvalidation(
  cpr: CPRValues,
  override: FirstDayOverride,
  newPeriodCandles: DailyCandle[],
): { validity: BiasValidity; reason: string | null; date: string | null } {
  if (!override || newPeriodCandles.length <= 1) {
    return { validity: override ? 'VALID' : 'PENDING', reason: null, date: null };
  }
  const subsequent = newPeriodCandles.slice(1);
  for (const c of subsequent) {
    if (override === 'BULLISH' && c.close < cpr.bc) {
      return {
        validity: 'INVALIDATED',
        reason: `Bullish bias invalidated — close ₹${c.close.toFixed(2)} on ${c.date} below BC ₹${cpr.bc.toFixed(2)}`,
        date: c.date,
      };
    }
    if (override === 'BEARISH' && c.close > cpr.tc) {
      return {
        validity: 'INVALIDATED',
        reason: `Bearish bias invalidated — close ₹${c.close.toFixed(2)} on ${c.date} above TC ₹${cpr.tc.toFixed(2)}`,
        date: c.date,
      };
    }
  }
  return { validity: 'VALID', reason: null, date: null };
}



/**
 * Determine bias from two-period CPR relationship (prior vs current).
 * Implements the rule hierarchy from the spec.
 */
function determineBias(current: CPRValues, prior: CPRValues | null): Bias {
  if (!prior) return 'NEUTRAL';

  const currentTC = current.tc;
  const currentBC = current.bc;
  const priorTC = prior.tc;
  const priorBC = prior.bc;

  const overlapping = currentTC >= priorBC && priorTC >= currentBC;
  const currentWidth = currentTC - currentBC;
  const priorWidth = priorTC - priorBC;
  const priorRange = prior.high - prior.low;

  // Rule 1: Strong bullish — current CPR entirely above prior TC
  if (currentBC > priorTC) return 'STRONG_BULLISH';

  // Rule 3: Strong bearish — current CPR entirely below prior BC
  if (currentTC < priorBC) return 'STRONG_BEARISH';

  // Rule 5: Identical CPR → range breakout setup
  if (Math.abs(currentTC - priorTC) / priorTC < 0.001 && Math.abs(currentBC - priorBC) / priorBC < 0.001) {
    return 'RANGE_BREAKOUT_SETUP';
  }

  // Rule 2: Moderate bullish — overlap and current shifted up
  if (overlapping && currentBC >= priorBC && currentTC >= priorTC) return 'MODERATE_BULLISH';

  // Rule 4: Moderate bearish — overlap and current shifted down
  if (overlapping && currentBC <= priorBC && currentTC <= priorTC) return 'MODERATE_BEARISH';

  // Rule 6: Sideways — current CPR width wider than the prior month range
  if (currentWidth > priorRange) return 'SIDEWAYS_MONTH';

  // Rule 7: High conviction breakout — current narrower than prior
  if (currentWidth < priorWidth) return 'HIGH_CONVICTION_BREAKOUT';

  return 'NEUTRAL';
}

/**
 * Classify market type using current CPR width vs prior month's true range.
 */
function determineMarketType(current: CPRValues, prior: CPRValues | null): MarketType {
  if (!prior) return 'NORMAL';
  const currentWidth = current.tc - current.bc;
  const priorRange = prior.high - prior.low;
  if (priorRange <= 0) return 'NORMAL';
  if (currentWidth <= priorRange * 0.25) return 'TREND_MONTH';
  if (currentWidth >= priorRange * 0.75) return 'RANGE_MONTH';
  return 'NORMAL';
}

/**
 * Determine the actionable signal based on bias and price action vs prior period H/L.
 */
function determineSignal(
  bias: Bias,
  cmp: number,
  current: CPRValues,
  prior: CPRValues | null,
): Signal {
  const tc = current.tc;
  const bc = current.bc;
  const priorHigh = prior?.high ?? current.high;
  const priorLow = prior?.low ?? current.low;

  // Bullish bias → look for pullback or breakout
  if (bias === 'STRONG_BULLISH' || bias === 'MODERATE_BULLISH') {
    if (cmp > priorHigh) return 'BREAKOUT_BUY';
    // pullback into CPR zone
    if (cmp >= bc && cmp <= tc) return 'BUY_THE_DIP';
    // Above CPR but below prior high → still anticipate breakout / dip
    if (cmp > tc) return 'BUY_THE_DIP';
    return 'BUY_THE_DIP';
  }

  // Bearish bias → rally or breakdown
  if (bias === 'STRONG_BEARISH' || bias === 'MODERATE_BEARISH') {
    if (cmp < priorLow) return 'BREAKDOWN_SELL';
    if (cmp >= bc && cmp <= tc) return 'SELL_THE_RALLY';
    if (cmp < bc) return 'SELL_THE_RALLY';
    return 'SELL_THE_RALLY';
  }

  // Range breakout setup — direction decided by close vs prior H/L
  if (bias === 'RANGE_BREAKOUT_SETUP' || bias === 'HIGH_CONVICTION_BREAKOUT') {
    if (cmp > priorHigh) return 'RANGE_BREAKOUT_BUY';
    if (cmp < priorLow) return 'RANGE_BREAKOUT_SELL';
    return 'NO_TRADE';
  }

  return 'NO_TRADE';
}

export function generateTradingPlan(
  cpr: CPRValues,
  stock: StockData,
  _cprWidth: unknown,
  _twoDayRelation: unknown,
  _cprTrend: unknown,
  timeframe: TradingType,
  priorCPR: CPRValues | null = null,
  newPeriodCandles: DailyCandle[] = [],
): TradingPlan {
  const cmp = stock.cmp;

  // 1. Initial bias from CPR structure (prior vs current)
  const initialBias = determineBias(cpr, priorCPR);
  const marketType = determineMarketType(cpr, priorCPR);

  // 2. First-day price-vs-CPR override (highest priority)
  const { override, date: firstDayDate } = detectFirstDayOverride(cpr, newPeriodCandles);
  const firstDayOverrideApplied = override !== null;

  // 3. Invalidation check after override
  const invalidation = detectInvalidation(cpr, override, newPeriodCandles);

  // 4. Effective bias = override (if applied & still valid) else initial
  let effectiveBias: Bias = initialBias;
  if (override === 'BULLISH' && invalidation.validity !== 'INVALIDATED') {
    effectiveBias = 'STRONG_BULLISH';
  } else if (override === 'BEARISH' && invalidation.validity !== 'INVALIDATED') {
    effectiveBias = 'STRONG_BEARISH';
  } else if (invalidation.validity === 'INVALIDATED') {
    // After invalidation, do NOT keep old bias — fall back to NEUTRAL pending reassessment
    effectiveBias = 'NEUTRAL';
  }

  const bias = effectiveBias;
  const signal = invalidation.validity === 'INVALIDATED'
    ? 'NO_TRADE'
    : determineSignal(bias, cmp, cpr, priorCPR);


  // Build entry zone, stop loss, targets per signal
  let entryZone = '';
  let stopLoss = '';
  const targets: string[] = [];

  // For TREND_MONTH allow extended R2/S2; for RANGE_MONTH cap at R1/S1
  const useExtendedTargets = marketType !== 'RANGE_MONTH';

  switch (signal) {
    case 'BUY_THE_DIP':
      entryZone = `Pullback into CPR: ₹${cpr.bc.toFixed(2)} – ₹${cpr.tc.toFixed(2)} on bullish reversal candle`;
      stopLoss = `Below BC: ₹${(cpr.bc * 0.995).toFixed(2)} (closing basis)`;
      targets.push(`T1 (R1): ₹${cpr.r1.toFixed(2)}`);
      if (useExtendedTargets) targets.push(`T2 (R2): ₹${cpr.r2.toFixed(2)}`);
      if (marketType === 'TREND_MONTH') targets.push(`T3 (R3, extended): ₹${cpr.r3.toFixed(2)}`);
      break;

    case 'BREAKOUT_BUY':
      entryZone = priorCPR
        ? `Buy on close above prior period high: ₹${priorCPR.high.toFixed(2)}`
        : `Buy on close above prior high: ₹${cpr.high.toFixed(2)}`;
      stopLoss = `Below breakout level or BC: ₹${cpr.bc.toFixed(2)}`;
      targets.push(`T1 (R1): ₹${cpr.r1.toFixed(2)}`);
      if (useExtendedTargets) targets.push(`T2 (R2): ₹${cpr.r2.toFixed(2)}`);
      if (marketType === 'TREND_MONTH') targets.push(`T3 (R3, extended): ₹${cpr.r3.toFixed(2)}`);
      break;

    case 'SELL_THE_RALLY':
      entryZone = `Rally into CPR: ₹${cpr.bc.toFixed(2)} – ₹${cpr.tc.toFixed(2)} on bearish rejection candle`;
      stopLoss = `Above TC: ₹${(cpr.tc * 1.005).toFixed(2)} (closing basis)`;
      targets.push(`T1 (S1): ₹${cpr.s1.toFixed(2)}`);
      if (useExtendedTargets) targets.push(`T2 (S2): ₹${cpr.s2.toFixed(2)}`);
      if (marketType === 'TREND_MONTH') targets.push(`T3 (S3, extended): ₹${cpr.s3.toFixed(2)}`);
      break;

    case 'BREAKDOWN_SELL':
      entryZone = priorCPR
        ? `Short on close below prior period low: ₹${priorCPR.low.toFixed(2)}`
        : `Short on close below prior low: ₹${cpr.low.toFixed(2)}`;
      stopLoss = `Above breakdown level or TC: ₹${cpr.tc.toFixed(2)}`;
      targets.push(`T1 (S1): ₹${cpr.s1.toFixed(2)}`);
      if (useExtendedTargets) targets.push(`T2 (S2): ₹${cpr.s2.toFixed(2)}`);
      if (marketType === 'TREND_MONTH') targets.push(`T3 (S3, extended): ₹${cpr.s3.toFixed(2)}`);
      break;

    case 'RANGE_BREAKOUT_BUY':
      entryZone = `Buy on confirmed close above prior high: ₹${(priorCPR?.high ?? cpr.high).toFixed(2)}`;
      stopLoss = `Below BC: ₹${cpr.bc.toFixed(2)}`;
      targets.push(`T1 (R1): ₹${cpr.r1.toFixed(2)}`);
      targets.push(`T2 (R2): ₹${cpr.r2.toFixed(2)}`);
      break;

    case 'RANGE_BREAKOUT_SELL':
      entryZone = `Short on confirmed close below prior low: ₹${(priorCPR?.low ?? cpr.low).toFixed(2)}`;
      stopLoss = `Above TC: ₹${cpr.tc.toFixed(2)}`;
      targets.push(`T1 (S1): ₹${cpr.s1.toFixed(2)}`);
      targets.push(`T2 (S2): ₹${cpr.s2.toFixed(2)}`);
      break;

    case 'NO_TRADE':
    default:
      entryZone = 'No entry — wait for breakout/breakdown confirmation outside CPR';
      stopLoss = '—';
      targets.push(`Watch upside: ₹${(priorCPR?.high ?? cpr.high).toFixed(2)}`);
      targets.push(`Watch downside: ₹${(priorCPR?.low ?? cpr.low).toFixed(2)}`);
      break;
  }

  // Reasoning — based on CPR relationship and price action
  const reasoning: string[] = [];

  // Override / invalidation reasoning takes top spot
  if (firstDayOverrideApplied) {
    reasoning.push(
      `🔒 Previous Month Close Bias APPLIED (${firstDayDate}): close ${
        override === 'BULLISH' ? `above TC ₹${cpr.tc.toFixed(2)} → forced BULLISH` : `below BC ₹${cpr.bc.toFixed(2)} → forced BEARISH`
      }. Price position overrides CPR structure.`,
    );
  }
  if (invalidation.validity === 'INVALIDATED' && invalidation.reason) {
    reasoning.push(`❌ ${invalidation.reason}. Bias must be reassessed — not continuing with old bias.`);
  }

  if (priorCPR) {
    const rel =
      cpr.bc > priorCPR.tc
        ? 'Current CPR is entirely above prior period TC → strong upside shift'
        : cpr.tc < priorCPR.bc
        ? 'Current CPR is entirely below prior period BC → strong downside shift'
        : cpr.tc >= priorCPR.bc && priorCPR.tc >= cpr.bc
        ? 'Current and prior CPRs overlap → continuation of prior trend likely'
        : 'CPR has shifted relative to prior period';
    reasoning.push(`Initial CPR-structure bias: ${initialBias.replace(/_/g, ' ')} — ${rel}`);

    const wRatio = (cpr.tc - cpr.bc) / Math.max(0.0001, priorCPR.high - priorCPR.low);
    if (wRatio <= 0.25) reasoning.push('Current CPR width ≤ 25% of prior range → trending period expected');
    else if (wRatio >= 0.75) reasoning.push('Current CPR width ≥ 75% of prior range → range-bound period expected');
  } else {
    reasoning.push('No prior period available — bias is neutral');
  }

  if (cmp > cpr.tc) reasoning.push(`CMP (₹${cmp.toFixed(2)}) is above current TC → bullish positioning`);
  else if (cmp < cpr.bc) reasoning.push(`CMP (₹${cmp.toFixed(2)}) is below current BC → bearish positioning`);
  else reasoning.push(`CMP (₹${cmp.toFixed(2)}) is inside CPR → awaiting directional break`);

  // Notes: trade management & universal rules
  const notes: string[] = [];
  if (invalidation.validity === 'INVALIDATED') {
    notes.push('🛑 Bias invalidated — exit existing positions and wait for fresh CPR-based setup');
  }
  if (signal !== 'NO_TRADE') {
    if (signal.includes('BUY')) notes.push('🟢 Long management: trail stop below BC as price advances');
    if (signal.includes('SELL') || signal === 'BREAKDOWN_SELL') notes.push('🔴 Short management: trail stop above TC as price declines');
    notes.push('✅ Wait for daily candle close confirmation — no intraday triggers');
  }
  if (marketType === 'TREND_MONTH') notes.push('🚀 Trend period — hold longer, allow extended targets beyond R2/S2');
  if (marketType === 'RANGE_MONTH') notes.push('📊 Range period — book early at R1/S1 and reduce position size');
  if (bias === 'SIDEWAYS_MONTH') notes.push('⚪ Sideways bias — avoid fresh trades unless clean breakout occurs');

  notes.push(`⏱️ Timeframe: ${timeframe === 'positional' ? 'Positional (multi-day to multi-week)' : 'Long term'}`);

  // Backward-compat fields used by any legacy UI
  const openVsCPR = getOpenVsCPR(stock.open, cpr.tc, cpr.bc);
  const cprTrend = priorCPR ? getCPRTrend(cpr.pivot, priorCPR.pivot) : 'sideways';
  const confidence: 'low' | 'medium' | 'high' =
    bias === 'STRONG_BULLISH' || bias === 'STRONG_BEARISH' || bias === 'HIGH_CONVICTION_BREAKOUT'
      ? 'high'
      : bias === 'NEUTRAL' || bias === 'SIDEWAYS_MONTH'
      ? 'low'
      : 'medium';

  return {
    bias,
    initialBias,
    marketType,
    signal,
    entryZone,
    stopLoss,
    targets,
    reasoning,
    notes,
    firstDayOverride: override,
    firstDayOverrideApplied,
    firstDayCloseDate: firstDayDate,
    biasValidity: invalidation.validity,
    invalidationReason: invalidation.reason,
    invalidationDate: invalidation.date,
    openVsCPR,
    cprTrend,
    confidence,
    dayType: marketType === 'TREND_MONTH' ? 'trend' : marketType === 'RANGE_MONTH' ? 'range' : 'breakout',
    entry: entryZone,
  };
}
