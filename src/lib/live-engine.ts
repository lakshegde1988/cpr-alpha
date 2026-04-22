import type { Bias, CPRValues, Signal } from '@/types/trading';

export type MarketState = 'ABOVE_VALUE' | 'INSIDE_VALUE' | 'BELOW_VALUE';

export type ScenarioStatus =
  | 'WAITING'
  | 'PULLBACK_ACTIVE'
  | 'RALLY_ACTIVE'
  | 'ENTRY_TRIGGERED'
  | 'BREAKOUT_TRIGGERED'
  | 'FAILED_BREAKOUT'
  | 'INVALIDATED';

export type ScenarioKind = 'BULLISH' | 'BEARISH' | 'BREAKOUT' | 'NONE';

export interface PriceTick {
  cmp: number;
  ts: number; // epoch ms
}

export interface LiveSignal {
  id: string;
  ts: number;
  type: 'ENTRY' | 'EXIT_SWITCH' | 'INFO';
  direction: 'LONG' | 'SHORT' | 'NONE';
  price: number;
  reason: string;
}

export function getMarketState(cmp: number, cpr: CPRValues): MarketState {
  if (cmp > cpr.tc) return 'ABOVE_VALUE';
  if (cmp < cpr.bc) return 'BELOW_VALUE';
  return 'INSIDE_VALUE';
}

export function scenarioKindFromBias(bias: Bias, signal: Signal): ScenarioKind {
  if (signal === 'RANGE_BREAKOUT_BUY' || signal === 'RANGE_BREAKOUT_SELL') return 'BREAKOUT';
  if (bias === 'RANGE_BREAKOUT_SETUP' || bias === 'HIGH_CONVICTION_BREAKOUT') return 'BREAKOUT';
  if (bias === 'STRONG_BULLISH' || bias === 'MODERATE_BULLISH') return 'BULLISH';
  if (bias === 'STRONG_BEARISH' || bias === 'MODERATE_BEARISH') return 'BEARISH';
  return 'NONE';
}

/**
 * Compute scenario status given CMP + previous tick (for direction inference).
 */
export function computeScenarioStatus(
  kind: ScenarioKind,
  cpr: CPRValues,
  prior: CPRValues | null,
  cmp: number,
  prevCmp: number | null,
): ScenarioStatus {
  const tc = cpr.tc;
  const bc = cpr.bc;
  const priorHigh = prior?.high ?? cpr.high;
  const priorLow = prior?.low ?? cpr.low;
  const movingUp = prevCmp != null ? cmp > prevCmp : false;
  const movingDown = prevCmp != null ? cmp < prevCmp : false;

  if (kind === 'BULLISH') {
    if (cmp < bc) return 'INVALIDATED';
    // bouncing from BC zone upward → entry trigger
    if (cmp >= bc && cmp <= tc && movingUp && prevCmp != null && prevCmp <= bc * 1.002) {
      return 'ENTRY_TRIGGERED';
    }
    if (cmp > tc && prevCmp != null && prevCmp <= tc) {
      // crossed above TC → entry confirmation
      return 'ENTRY_TRIGGERED';
    }
    if (cmp >= bc && cmp <= tc) return 'PULLBACK_ACTIVE';
    return 'WAITING';
  }

  if (kind === 'BEARISH') {
    if (cmp > tc) return 'INVALIDATED';
    if (cmp >= bc && cmp <= tc && movingDown && prevCmp != null && prevCmp >= tc * 0.998) {
      return 'ENTRY_TRIGGERED';
    }
    if (cmp < bc && prevCmp != null && prevCmp >= bc) {
      return 'ENTRY_TRIGGERED';
    }
    if (cmp >= bc && cmp <= tc) return 'RALLY_ACTIVE';
    return 'WAITING';
  }

  if (kind === 'BREAKOUT') {
    if (cmp > priorHigh) return 'BREAKOUT_TRIGGERED';
    if (cmp < priorLow) return 'BREAKOUT_TRIGGERED';
    // Was breakout active and now back inside range → failed
    if (prevCmp != null && (prevCmp > priorHigh || prevCmp < priorLow) && cmp <= priorHigh && cmp >= priorLow) {
      return 'FAILED_BREAKOUT';
    }
    return 'WAITING';
  }

  return 'WAITING';
}

export function directionForKind(kind: ScenarioKind, cmp: number, prior: CPRValues | null): 'LONG' | 'SHORT' | 'NONE' {
  if (kind === 'BULLISH') return 'LONG';
  if (kind === 'BEARISH') return 'SHORT';
  if (kind === 'BREAKOUT' && prior) {
    if (cmp > prior.high) return 'LONG';
    if (cmp < prior.low) return 'SHORT';
  }
  return 'NONE';
}

export function buildSignalFromStatus(
  status: ScenarioStatus,
  kind: ScenarioKind,
  cmp: number,
  prior: CPRValues | null,
): LiveSignal | null {
  const dir = directionForKind(kind, cmp, prior);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (status === 'ENTRY_TRIGGERED' || status === 'BREAKOUT_TRIGGERED') {
    return {
      id,
      ts: Date.now(),
      type: 'ENTRY',
      direction: dir,
      price: cmp,
      reason:
        status === 'BREAKOUT_TRIGGERED'
          ? `Breakout confirmed at ₹${cmp.toFixed(2)}`
          : `Entry triggered at ₹${cmp.toFixed(2)}`,
    };
  }
  if (status === 'INVALIDATED') {
    return {
      id,
      ts: Date.now(),
      type: 'EXIT_SWITCH',
      direction: 'NONE',
      price: cmp,
      reason: 'Bias failed — primary scenario invalidated',
    };
  }
  if (status === 'FAILED_BREAKOUT') {
    return {
      id,
      ts: Date.now(),
      type: 'EXIT_SWITCH',
      direction: 'NONE',
      price: cmp,
      reason: 'Failed breakout — price returned inside range',
    };
  }
  return null;
}
