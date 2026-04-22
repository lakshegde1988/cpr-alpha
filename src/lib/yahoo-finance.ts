import type { DailyCandle, StockData, TradingType } from '@/types/trading';
import { supabase } from '@/integrations/supabase/client';

function getDaysToFetch(timeframe: TradingType): number {
  switch (timeframe) {
    case 'positional': return 90;
    case 'longterm': return 400;
    default: return 90;
  }
}

async function callYahooFinance(symbol: string, days: number): Promise<any> {
  const { data, error } = await supabase.functions.invoke('yahoo-finance', {
    body: { symbol, days },
  });

  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data?.ok) throw new Error(data?.error || 'Failed to fetch from Yahoo Finance');
  return data.data;
}

export async function fetchDailyCandles(symbol: string, timeframe: TradingType): Promise<DailyCandle[]> {
  const days = getDaysToFetch(timeframe);
  const data = await callYahooFinance(symbol, days);

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No data returned from Yahoo Finance');

  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0];
  if (!quotes) throw new Error('No quote data');

  const candles: DailyCandle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = quotes.open?.[i];
    const h = quotes.high?.[i];
    const l = quotes.low?.[i];
    const c = quotes.close?.[i];
    const v = quotes.volume?.[i];

    if (o == null || h == null || l == null || c == null) continue;

    // Convert to IST (Asia/Kolkata = UTC+5:30)
    const utcDate = new Date(timestamps[i] * 1000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcDate.getTime() + istOffset);

    candles.push({
      date: istDate.toISOString().split('T')[0],
      open: Math.round(o * 100) / 100,
      high: Math.round(h * 100) / 100,
      low: Math.round(l * 100) / 100,
      close: Math.round(c * 100) / 100,
      volume: v || 0,
    });
  }

  return candles;
}

export async function fetchStockData(symbol: string): Promise<StockData> {
  const candles = await fetchDailyCandles(symbol, 'positional');
  if (candles.length === 0) throw new Error('No candle data');

  const latest = candles[candles.length - 1];
  const prev = candles.length > 1 ? candles[candles.length - 2] : latest;

  return {
    symbol,
    cmp: latest.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    prevClose: prev.close,
  };
}

/**
 * Lightweight CMP refresh — uses Yahoo Finance meta.regularMarketPrice when available.
 */
export async function fetchLiveQuote(symbol: string): Promise<{ cmp: number; ts: number }> {
  const data = await callYahooFinance(symbol, 5);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No quote data');

  const meta = result.meta;
  if (meta?.regularMarketPrice != null) {
    return {
      cmp: Math.round(meta.regularMarketPrice * 100) / 100,
      ts: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    };
  }

  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
  const timestamps: number[] = result.timestamp ?? [];
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      return { cmp: Math.round(closes[i] * 100) / 100, ts: (timestamps[i] ?? 0) * 1000 };
    }
  }
  throw new Error('No price data available');
}

