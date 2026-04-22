export type TradingType = 'positional' | 'longterm';
export type CPRWidth = 'narrow' | 'moderate' | 'wide';
export type TwoDayRelation =
  | 'higher_value_higher'
  | 'higher_value_lower'
  | 'lower_value_higher'
  | 'lower_value_lower'
  | 'overlapping_higher'
  | 'overlapping_lower'
  | 'unchanged';

export type OpenVsCPR = 'gap_up' | 'gap_down' | 'inside';
export type CPRTrend = 'rising' | 'falling' | 'sideways';

// New bias enum aligned with two-period CPR relationship rules
export type Bias =
  | 'STRONG_BULLISH'
  | 'MODERATE_BULLISH'
  | 'STRONG_BEARISH'
  | 'MODERATE_BEARISH'
  | 'RANGE_BREAKOUT_SETUP'
  | 'SIDEWAYS_MONTH'
  | 'HIGH_CONVICTION_BREAKOUT'
  | 'NEUTRAL';

export type MarketType = 'TREND_MONTH' | 'RANGE_MONTH' | 'NORMAL';
export type Signal =
  | 'BUY_THE_DIP'
  | 'BREAKOUT_BUY'
  | 'SELL_THE_RALLY'
  | 'BREAKDOWN_SELL'
  | 'RANGE_BREAKOUT_BUY'
  | 'RANGE_BREAKOUT_SELL'
  | 'NO_TRADE';

export type DayType = 'trend' | 'range' | 'breakout' | 'reversal';
export type Confidence = 'low' | 'medium' | 'high';

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CPRValues {
  pivot: number;
  bc: number;
  tc: number;
  open: number;
  high: number;
  low: number;
  close: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  periodStart: string;
  periodEnd: string;
}

export interface StockData {
  symbol: string;
  cmp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
}

export type FirstDayOverride = 'BULLISH' | 'BEARISH' | null;
export type BiasValidity = 'VALID' | 'INVALIDATED' | 'PENDING';

export interface TradingPlan {
  bias: Bias;            // Final (effective) bias after override + invalidation
  initialBias: Bias;     // Bias derived purely from CPR structure
  marketType: MarketType;
  signal: Signal;
  entryZone: string;
  stopLoss: string;
  targets: string[];
  reasoning: string[];
  notes: string[];
  // First-day override + invalidation tracking
  firstDayOverride: FirstDayOverride;        // null if no override applied
  firstDayOverrideApplied: boolean;
  firstDayCloseDate: string | null;          // YYYY-MM-DD of first trading day used
  biasValidity: BiasValidity;
  invalidationReason: string | null;
  invalidationDate: string | null;
  // Backward-compat fields (kept so existing imports stay safe)
  openVsCPR: OpenVsCPR;
  cprTrend: CPRTrend;
  confidence: Confidence;
  dayType: DayType;
  entry: string;
}

export interface Stock {
  Symbol: string;
}
