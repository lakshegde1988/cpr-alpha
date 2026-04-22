import type {
  Bias,
  CPRValues,
  CPRWidth,
  MarketType,
  Signal,
  StockData,
  TradingPlan,
} from '@/types/trading';

export type QualityLabel = 'A+ Setup' | 'Strong Setup' | 'Moderate Setup' | 'Avoid Trading';
export type BiasStatus = 'CONFIRMED' | 'FAILED' | 'NEUTRAL';
export type DirectionTag = 'LONG' | 'SHORT' | 'NONE';
export type DayTypeLabel = 'Trend Day' | 'Range Day' | 'Breakout Day' | 'Normal Day';

export interface AlternatePlan {
  trigger: string;
  direction: DirectionTag;
  entry: string;
  stopLoss: string;
  target: string;
}

export interface IntelligenceInsights {
  // Market context
  relationshipLabel: string;
  widthLabel: string;
  expectedDayType: DayTypeLabel;

  // Bias panel
  initialBias: Bias;
  finalBias: Bias;
  biasStatus: BiasStatus;

  // Direction
  direction: DirectionTag;

  // Confidence
  confidenceScore: number; // 1-10
  qualityLabel: QualityLabel;

  // Alternate plan
  alternatePlan: AlternatePlan;

  // Flags
  lowConvictionWarning: boolean;
  highProbabilityFlag: boolean;
  reversalWarning: boolean;
}

function relationshipFromBias(bias: Bias): string {
  switch (bias) {
    case 'STRONG_BULLISH':
      return 'Higher Value';
    case 'MODERATE_BULLISH':
      return 'Overlapping Higher';
    case 'STRONG_BEARISH':
      return 'Lower Value';
    case 'MODERATE_BEARISH':
      return 'Overlapping Lower';
    case 'RANGE_BREAKOUT_SETUP':
      return 'Unchanged';
    case 'HIGH_CONVICTION_BREAKOUT':
      return 'Inside Value';
    case 'SIDEWAYS_MONTH':
      return 'Outside Value';
    default:
      return 'Neutral';
  }
}

function widthLabelOf(w: CPRWidth | null): string {
  if (!w) return 'Unknown';
  if (w === 'narrow') return 'Narrow';
  if (w === 'wide') return 'Wide';
  return 'Moderate';
}

function dayTypeOf(marketType: MarketType, bias: Bias): DayTypeLabel {
  if (bias === 'RANGE_BREAKOUT_SETUP' || bias === 'HIGH_CONVICTION_BREAKOUT') return 'Breakout Day';
  if (marketType === 'TREND_MONTH') return 'Trend Day';
  if (marketType === 'RANGE_MONTH') return 'Range Day';
  return 'Normal Day';
}

function directionFromSignal(signal: Signal): DirectionTag {
  if (signal === 'NO_TRADE') return 'NONE';
  if (signal.includes('BUY')) return 'LONG';
  if (signal.includes('SELL')) return 'SHORT';
  return 'NONE';
}

/**
 * Bias status:
 * CONFIRMED → CMP is on the same side as the bias relative to CPR
 * FAILED    → CMP is on the opposite side (bullish bias but price below BC, etc.)
 * NEUTRAL   → otherwise
 */
function computeBiasStatus(bias: Bias, cmp: number, cpr: CPRValues, prior: CPRValues | null): BiasStatus {
  const isBull = bias === 'STRONG_BULLISH' || bias === 'MODERATE_BULLISH';
  const isBear = bias === 'STRONG_BEARISH' || bias === 'MODERATE_BEARISH';

  if (isBull) {
    if (cmp < cpr.bc) return 'FAILED';
    if (cmp > cpr.tc || (prior && cmp > prior.high)) return 'CONFIRMED';
    return 'NEUTRAL';
  }
  if (isBear) {
    if (cmp > cpr.tc) return 'FAILED';
    if (cmp < cpr.bc || (prior && cmp < prior.low)) return 'CONFIRMED';
    return 'NEUTRAL';
  }
  if (bias === 'RANGE_BREAKOUT_SETUP' || bias === 'HIGH_CONVICTION_BREAKOUT') {
    if (prior && (cmp > prior.high || cmp < prior.low)) return 'CONFIRMED';
    return 'NEUTRAL';
  }
  return 'NEUTRAL';
}

/**
 * Confidence score (1–10) blended from bias strength, market type, width and bias confirmation.
 */
function computeConfidence(
  bias: Bias,
  marketType: MarketType,
  width: CPRWidth | null,
  status: BiasStatus,
): number {
  let score = 5;

  // Bias strength
  if (bias === 'STRONG_BULLISH' || bias === 'STRONG_BEARISH') score += 3;
  else if (bias === 'HIGH_CONVICTION_BREAKOUT') score += 2;
  else if (bias === 'MODERATE_BULLISH' || bias === 'MODERATE_BEARISH') score += 1;
  else if (bias === 'SIDEWAYS_MONTH' || bias === 'NEUTRAL') score -= 2;

  // Market type
  if (marketType === 'TREND_MONTH') score += 1;
  if (marketType === 'RANGE_MONTH') score -= 1;

  // Width
  if (width === 'narrow') score += 1;
  if (width === 'wide') score -= 1;

  // Bias confirmation
  if (status === 'CONFIRMED') score += 1;
  if (status === 'FAILED') score -= 3;

  return Math.max(1, Math.min(10, Math.round(score)));
}

function qualityFromScore(score: number): QualityLabel {
  if (score >= 9) return 'A+ Setup';
  if (score >= 7) return 'Strong Setup';
  if (score >= 5) return 'Moderate Setup';
  return 'Avoid Trading';
}

function buildAlternatePlan(
  bias: Bias,
  cpr: CPRValues,
  prior: CPRValues | null,
): AlternatePlan {
  const ph = prior?.high ?? cpr.high;
  const pl = prior?.low ?? cpr.low;

  // Bullish primary → alternate is breakdown short
  if (bias === 'STRONG_BULLISH' || bias === 'MODERATE_BULLISH') {
    return {
      trigger: `Daily close below BC ₹${cpr.bc.toFixed(2)} or prior low ₹${pl.toFixed(2)}`,
      direction: 'SHORT',
      entry: `On confirmed breakdown below ₹${pl.toFixed(2)}`,
      stopLoss: `Above TC ₹${cpr.tc.toFixed(2)}`,
      target: `S1 ₹${cpr.s1.toFixed(2)} → S2 ₹${cpr.s2.toFixed(2)}`,
    };
  }

  // Bearish primary → alternate is breakout long
  if (bias === 'STRONG_BEARISH' || bias === 'MODERATE_BEARISH') {
    return {
      trigger: `Daily close above TC ₹${cpr.tc.toFixed(2)} or prior high ₹${ph.toFixed(2)}`,
      direction: 'LONG',
      entry: `On confirmed breakout above ₹${ph.toFixed(2)}`,
      stopLoss: `Below BC ₹${cpr.bc.toFixed(2)}`,
      target: `R1 ₹${cpr.r1.toFixed(2)} → R2 ₹${cpr.r2.toFixed(2)}`,
    };
  }

  // Range / breakout setup → alternate is the opposite breakout
  return {
    trigger: `If price reverses through opposite extreme of prior period`,
    direction: 'NONE',
    entry: `Breakout above ₹${ph.toFixed(2)} → LONG · Breakdown below ₹${pl.toFixed(2)} → SHORT`,
    stopLoss: `Opposite side of CPR (BC ₹${cpr.bc.toFixed(2)} / TC ₹${cpr.tc.toFixed(2)})`,
    target: `R1/S1 first, then R2/S2`,
  };
}

export function computeIntelligence(
  plan: TradingPlan,
  cpr: CPRValues,
  prior: CPRValues | null,
  stock: StockData,
  width: CPRWidth | null,
): IntelligenceInsights {
  const status = computeBiasStatus(plan.bias, stock.cmp, cpr, prior);
  const confidenceScore = computeConfidence(plan.bias, plan.marketType, width, status);
  const qualityLabel = qualityFromScore(confidenceScore);
  const direction = directionFromSignal(plan.signal);

  // Final bias flips when status = FAILED
  const finalBias: Bias =
    status === 'FAILED'
      ? plan.bias === 'STRONG_BULLISH' || plan.bias === 'MODERATE_BULLISH'
        ? 'MODERATE_BEARISH'
        : plan.bias === 'STRONG_BEARISH' || plan.bias === 'MODERATE_BEARISH'
          ? 'MODERATE_BULLISH'
          : plan.bias
      : plan.bias;

  const lowConvictionWarning = width === 'wide' && confidenceScore < 6;
  const highProbabilityFlag = width === 'narrow' && status === 'CONFIRMED';
  const reversalWarning = status === 'FAILED';

  return {
    relationshipLabel: relationshipFromBias(plan.bias),
    widthLabel: widthLabelOf(width),
    expectedDayType: dayTypeOf(plan.marketType, plan.bias),
    initialBias: plan.bias,
    finalBias,
    biasStatus: status,
    direction,
    confidenceScore,
    qualityLabel,
    alternatePlan: buildAlternatePlan(plan.bias, cpr, prior),
    lowConvictionWarning,
    highProbabilityFlag,
    reversalWarning,
  };
}

export function biasColorClass(bias: Bias): string {
  if (bias.includes('BULLISH')) return 'text-bullish';
  if (bias.includes('BEARISH')) return 'text-bearish';
  return 'text-neutral';
}

export function biasBgClass(bias: Bias): string {
  if (bias.includes('BULLISH')) return 'bg-bullish/10 border-bullish/30';
  if (bias.includes('BEARISH')) return 'bg-bearish/10 border-bearish/30';
  return 'bg-neutral/10 border-neutral/30';
}

export function biasLabel(bias: Bias): string {
  return bias
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
