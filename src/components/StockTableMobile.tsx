import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { fetchStockData } from '@/lib/yahoo-finance';

interface Stock {
  Symbol: string;
}

interface StockQuote {
  symbol: string;
  cmp: number;
  percentChange: number;
}

interface StockTableMobileProps {
  onSelect: (symbol: string) => void;
  stocks: Stock[];
  quotes: Record<string, StockQuote>;
  loadingQuotes: boolean;
}

export function StockTableMobile({ onSelect, stocks, quotes, loadingQuotes }: StockTableMobileProps) {
  return (
    <div className="space-y-3">
      {stocks.map((stock) => {
        const quote = quotes[stock.Symbol];
        const isPositive = quote?.percentChange >= 0;
        
        return (
          <button
            key={stock.Symbol}
            onClick={() => onSelect(stock.Symbol)}
            className="w-full bg-card/50 border border-border rounded-lg p-3 hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-foreground text-sm">
                  {stock.Symbol}
                </span>
                {quote && quote.cmp > 0 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {quote.cmp.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {quote && quote.cmp > 0 ? (
                  <span className={`inline-flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(quote.percentChange).toFixed(2)}%
                  </span>
                ) : (
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
