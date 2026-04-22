import type { DailyCandle, CPRValues, TradingType } from '@/types/trading';

export function calculateCPR(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3;
  const bc = (high + low) / 2;
  const tc = (2 * pivot) - bc;
  const r1 = (2 * pivot) - low;
  const r2 = pivot + (high - low);
  const r3 = high + 2 * (pivot - low);
  const s1 = (2 * pivot) - high;
  const s2 = pivot - (high - low);
  const s3 = low - 2 * (high - pivot);
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    pivot: round(pivot), bc: round(bc), tc: round(tc),
    r1: round(r1), r2: round(r2), r3: round(r3),
    s1: round(s1), s2: round(s2), s3: round(s3),
  };
}

function getWeekNumber(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-W${monday.getMonth()}-${monday.getDate()}`;
}

function groupByWeek(candles: DailyCandle[]): Map<string, DailyCandle[]> {
  const weeks = new Map<string, DailyCandle[]>();
  for (const candle of candles) {
    const d = new Date(candle.date);
    const key = getWeekNumber(d);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(candle);
  }
  return weeks;
}

function groupByMonth(candles: DailyCandle[]): Map<string, DailyCandle[]> {
  const months = new Map<string, DailyCandle[]>();
  for (const candle of candles) {
    const d = new Date(candle.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(candle);
  }
  return months;
}

function groupByYear(candles: DailyCandle[]): Map<string, DailyCandle[]> {
  const years = new Map<string, DailyCandle[]>();
  for (const candle of candles) {
    const d = new Date(candle.date);
    const key = `${d.getFullYear()}`;
    if (!years.has(key)) years.set(key, []);
    years.get(key)!.push(candle);
  }
  return years;
}

function getLastCompletedGroup(groups: Map<string, DailyCandle[]>, currentKey: string): { key: string; candles: DailyCandle[] } | null {
  const keys = Array.from(groups.keys()).sort();
  const filtered = keys.filter(k => k < currentKey);
  if (filtered.length === 0) return null;
  const lastKey = filtered[filtered.length - 1];
  return { key: lastKey, candles: groups.get(lastKey)! };
}

function aggregateCandles(candles: DailyCandle[]): { open: number; high: number; low: number; close: number; start: string; end: string } {
  const sorted = [...candles].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return {
    open: sorted[0].open,
    high: Math.max(...sorted.map(c => c.high)),
    low: Math.min(...sorted.map(c => c.low)),
    close: sorted[sorted.length - 1].close,
    start: sorted[0].date,
    end: sorted[sorted.length - 1].date,
  };
}

function buildCPRFromCandles(periodCandles: DailyCandle[], periodStart: string, periodEnd: string, _timeframe: TradingType) {
  const agg = aggregateCandles(periodCandles);
  const { pivot, bc, tc, r1, r2, r3, s1, s2, s3 } = calculateCPR(agg.high, agg.low, agg.close);
  const cpr: CPRValues = {
    pivot, bc, tc, r1, r2, r3, s1, s2, s3,
    open: agg.open,
    high: agg.high,
    low: agg.low,
    close: agg.close,
    periodStart: periodStart || agg.start,
    periodEnd: periodEnd || agg.end,
  };
  return { cpr };
}

export function computeCPRForTimeframe(
  candles: DailyCandle[],
  timeframe: TradingType,
): { cpr: CPRValues; priorCPR: CPRValues | null; currentPeriodCandles: DailyCandle[] } | null {
  if (!candles || candles.length === 0) return null;

  const sorted = [...candles].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const now = new Date();

  const groups = timeframe === 'positional' ? groupByMonth(sorted) : groupByYear(sorted);
  const currentKey = timeframe === 'positional'
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : `${now.getFullYear()}`;

  // Last completed period = "current" CPR (used for THIS month/year's trading)
  const sortedKeys = Array.from(groups.keys()).sort().filter(k => k < currentKey);
  if (sortedKeys.length === 0) return null;

  const currentPeriodKey = sortedKeys[sortedKeys.length - 1];
  const currentPeriodCandles = groups.get(currentPeriodKey)!;
  const currentAgg = aggregateCandles(currentPeriodCandles);
  const current = buildCPRFromCandles(currentPeriodCandles, currentAgg.start, currentAgg.end, timeframe);

  // Prior period (the one before current) — used for bias comparison
  let priorCPR: CPRValues | null = null;
  if (sortedKeys.length >= 2) {
    const priorKey = sortedKeys[sortedKeys.length - 2];
    const priorCandles = groups.get(priorKey)!;
    const priorAgg = aggregateCandles(priorCandles);
    priorCPR = buildCPRFromCandles(priorCandles, priorAgg.start, priorAgg.end, timeframe).cpr;
  }

  // Candles inside the NEW (in-progress) period — used to detect first-day close
  // and subsequent invalidation. The CPR is fixed (from prior period); these candles
  // trade against it.
  const newPeriodCandles = (groups.get(currentKey) ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { cpr: current.cpr, priorCPR, currentPeriodCandles: newPeriodCandles };
}

export function getCPRWidth(tc: number, bc: number, cmp: number): 'narrow' | 'moderate' | 'wide' {
  const width = ((tc - bc) / cmp) * 100;
  if (width < 0.1) return 'narrow';
  if (width <= 0.5) return 'moderate';
  return 'wide';
}

export function getOpenVsCPR(open: number, tc: number, bc: number): 'gap_up' | 'gap_down' | 'inside' {
  if (open > tc) return 'gap_up';
  if (open < bc) return 'gap_down';
  return 'inside';
}

export function getCPRTrend(currentPivot: number, previousPivot: number): 'rising' | 'falling' | 'sideways' {
  const diff = ((currentPivot - previousPivot) / previousPivot) * 100;
  if (diff > 0.1) return 'rising';
  if (diff < -0.1) return 'falling';
  return 'sideways';
}

/**
 * Auto-calculate the 2-day CPR relationship by comparing today's CPR with yesterday's CPR.
 * Uses the last 2 completed daily candles to compute both CPRs, then checks overlap/position.
 */
export function getTwoDayRelation(candles: import('@/types/trading').DailyCandle[]): import('@/types/trading').TwoDayRelation {
  if (candles.length < 3) return 'unchanged';

  const sorted = [...candles].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // We need the last 2 completed candles to form "today's CPR" (from day N-1) and "yesterday's CPR" (from day N-2)
  const prevDay = sorted[sorted.length - 2]; // used to calc today's CPR
  const dayBefore = sorted[sorted.length - 3]; // used to calc yesterday's CPR

  const todayCPR = calculateCPR(prevDay.high, prevDay.low, prevDay.close);
  const yesterdayCPR = calculateCPR(dayBefore.high, dayBefore.low, dayBefore.close);

  const todayTC = Math.max(todayCPR.tc, todayCPR.bc);
  const todayBC = Math.min(todayCPR.tc, todayCPR.bc);
  const yestTC = Math.max(yesterdayCPR.tc, yesterdayCPR.bc);
  const yestBC = Math.min(yesterdayCPR.tc, yesterdayCPR.bc);

  // Check if CPRs overlap
  const overlapping = todayTC >= yestBC && yestTC >= todayBC;

  if (Math.abs(todayCPR.pivot - yesterdayCPR.pivot) / yesterdayCPR.pivot < 0.001) {
    return 'unchanged';
  }

  if (overlapping) {
    return todayCPR.pivot > yesterdayCPR.pivot ? 'overlapping_higher' : 'overlapping_lower';
  }

  // Non-overlapping: higher or lower value
  if (todayBC > yestTC) {
    // Today's CPR is entirely above yesterday's
    return todayCPR.tc > todayCPR.bc ? 'higher_value_higher' : 'higher_value_lower';
  }

  if (todayTC < yestBC) {
    // Today's CPR is entirely below yesterday's
    return todayCPR.tc > todayCPR.bc ? 'lower_value_higher' : 'lower_value_lower';
  }

  return todayCPR.pivot > yesterdayCPR.pivot ? 'overlapping_higher' : 'overlapping_lower';
}
