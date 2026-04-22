import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Stock {
  Symbol: string;
}

interface StockAutocompleteProps {
  onSelect: (symbol: string) => void;
  selected?: string | null;
  className?: string;
}

export function StockAutocomplete({ onSelect, selected, className }: StockAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Load all stocks on mount
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

  // Filter stocks based on search term
  const filteredStocks = useMemo(() => {
    if (!searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    return stocks.filter(stock => 
      stock.Symbol.toLowerCase().includes(term)
    ).slice(0, 50); // Limit to 50 results for performance
  }, [stocks, searchTerm]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setSearchTerm('');
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
    if (selected) {
      setSearchTerm(''); // Clear search when focusing on selected item
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!searchTerm) {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
        <input
          type="text"
          value={isFocused ? searchTerm : (selected || searchTerm)}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search stocks..."
          className={cn(
            "w-full pl-12 pr-12 py-4 bg-black/20 backdrop-blur-sm border border-gray-800/50 rounded-2xl",
            "focus:outline-none focus:ring-2 focus:ring-blue-800/50 focus:border-blue-700/50",
            "font-medium text-white placeholder:text-gray-500 text-base transition-all duration-300"
          )}
        />
        <ChevronDown 
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="backdrop-blur-sm bg-black/20 border border-gray-800/50 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto">
              {/* Loading state */}
              {loading && (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-white/60">Loading stocks...</p>
                </div>
              )}

              {/* No results */}
              {!loading && searchTerm && filteredStocks.length === 0 && (
                <div className="p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-sm font-mono text-gray-400 text-center">No stocks found</p>
                </div>
              )}

              {/* Results */}
              {!loading && filteredStocks.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  {filteredStocks.map((stock, index) => (
                    <motion.button
                      key={stock.Symbol}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleSelect(stock.Symbol)}
                      className={cn(
                        "w-full px-4 py-3 hover:bg-black/30 transition-colors duration-200 flex items-center gap-3 cursor-pointer border-b border-gray-800/50 last:border-b-0"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-mono text-base font-semibold text-white">{stock.Symbol}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Popular stocks when no search */}
              {!loading && !searchTerm && (
                <div className="p-6">
                  <p className="text-sm font-mono text-white">POPULAR STOCKS</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'KOTAKBANK'].map((symbol) => (
                      <button
                        key={symbol}
                        onClick={() => handleSelect(symbol)}
                        className="px-4 py-3 bg-black/10 hover:bg-black/20 backdrop-blur-sm rounded-xl transition-all duration-200 border border-gray-800/50 hover:border-gray-800/50"
                      >
                        <span className="text-sm font-mono text-white">{symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setIsFocused(false);
          }}
        />
      )}
    </div>
  );
}
