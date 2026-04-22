import { useState, useEffect, useMemo } from 'react';
import { Search, Check } from 'lucide-react';

interface Stock {
  Symbol: string;
}

interface StockSearchProps {
  onSelect: (symbol: string) => void;
  selected: string | null;
}

export function StockSearch({ onSelect, selected }: StockSearchProps) {
  const [search, setSearch] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
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
      .slice(0, 10); // Limit to 10 suggestions
  }, [stocks, search]);

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
        {selected && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
              {selected}
            </span>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredStocks.length > 0 ? (
            filteredStocks.map((stock) => (
              <button
                key={stock.Symbol}
                onClick={() => handleSelect(stock.Symbol)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-mono hover:bg-secondary/80 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <span>{stock.Symbol}</span>
                {selected === stock.Symbol && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))
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
