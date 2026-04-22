import { useState, useEffect, useMemo } from 'react';
import { Search, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchStockData } from '@/lib/yahoo-finance';

interface Stock {
  Symbol: string;
}

interface StockQuote {
  symbol: string;
  cmp: number;
  percentChange: number;
}

interface StockSearchBarProps {
  onSelect: (symbol: string) => void;
}

export function StockSearchBar({ onSelect }: StockSearchBarProps) {
  const [search, setSearch] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load stocks from public/stocks.json
  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true);
      try {
        const response = await fetch('/stocks.json');
        const data = await response.json();
        setStocks(data);
      } catch (error) {
        console.error('Failed to load stocks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStocks();
  }, []);

  // Filter stocks based on search
  const filteredStocks = useMemo(() => {
    if (!search) return [];
    return stocks
      .filter(stock => 
        stock.Symbol.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  }, [stocks, search]);

  // Fetch quotes for filtered stocks
  useEffect(() => {
    if (filteredStocks.length === 0) return;
    
    const fetchQuotes = async () => {
      const newQuotes: Record<string, StockQuote> = { ...quotes };
      
      const promises = filteredStocks.map(async (stock) => {
        if (newQuotes[stock.Symbol]) return; // Already fetched
        
        try {
          const data = await fetchStockData(stock.Symbol);
          const percentChange = ((data.cmp - data.prevClose) / data.prevClose) * 100;
          newQuotes[stock.Symbol] = {
            symbol: stock.Symbol,
            cmp: data.cmp,
            percentChange,
          };
        } catch (error) {
          console.error(`Failed to fetch quote for ${stock.Symbol}:`, error);
          newQuotes[stock.Symbol] = {
            symbol: stock.Symbol,
            cmp: 0,
            percentChange: 0,
          };
        }
      });

      await Promise.allSettled(promises);
      setQuotes(newQuotes);
    };

    fetchQuotes();
  }, [filteredStocks]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setSearch('');
    setShowSuggestions(false);
  };

  const handleInputChange = (value: string) => {
    setSearch(value);
    setShowSuggestions(value.length > 0);
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stock symbol..."
          value={search}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(search.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto max-w-full">
          {filteredStocks.length > 0 ? (
            filteredStocks.map((stock) => {
              const quote = quotes[stock.Symbol];
              const isPositive = quote?.percentChange >= 0;
              
              return (
                <button
                  key={stock.Symbol}
                  onClick={() => handleSelect(stock.Symbol)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-mono hover:bg-secondary/80 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{stock.Symbol}</span>
                    {quote && quote.cmp > 0 && (
                      <span className="text-xs text-muted-foreground">
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
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center font-mono">
              No stocks found
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 px-3 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading stocks...</span>
          </div>
        </div>
      )}
    </div>
  );
}
