import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { fetchStockData } from '@/lib/yahoo-finance';

interface Stock {
  Symbol: string;
}

interface StockQuote {
  symbol: string;
  cmp: number;
  percentChange: number;
}

interface StockTableProps {
  onSelect: (symbol: string) => void;
}

export function StockTable({ onSelect }: StockTableProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Load stocks from public/stocks.json
  useEffect(() => {
    const loadStocks = async () => {
      try {
        const response = await fetch('/stocks.json');
        const data = await response.json();
        setStocks(data);
      } catch (error) {
        console.error('Failed to load stocks:', error);
      } finally {
        setLoadingList(false);
      }
    };
    loadStocks();
  }, []);

  const totalPages = Math.ceil(stocks.length / itemsPerPage);
  
  const currentStocks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return stocks.slice(start, start + itemsPerPage);
  }, [stocks, currentPage]);

  // Fetch quotes for current page
  useEffect(() => {
    if (currentStocks.length === 0) return;
    
    const fetchQuotes = async () => {
      setLoadingQuotes(true);
      const newQuotes: Record<string, StockQuote> = { ...quotes };
      
      const promises = currentStocks.map(async (stock) => {
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
      setLoadingQuotes(false);
    };

    fetchQuotes();
  }, [currentStocks]);

  if (loadingList) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden overflow-x-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-secondary/50 text-muted-foreground font-mono">
              <tr>
                <th className="px-2 py-3 font-semibold text-xs sm:px-4 sm:text-sm">Stock</th>
                <th className="px-2 py-3 font-semibold text-right text-xs sm:px-4 sm:text-sm">CMP</th>
                <th className="px-2 py-3 font-semibold text-right text-xs sm:px-4 sm:text-sm hidden sm:table-cell">% Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {currentStocks.map((stock) => {
                const quote = quotes[stock.Symbol];
                const isPositive = quote?.percentChange >= 0;
                
                return (
                  <tr 
                    key={stock.Symbol}
                    onClick={() => onSelect(stock.Symbol)}
                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-2 py-3 font-mono font-medium text-foreground group-hover:text-primary transition-colors text-xs sm:px-4 sm:text-sm">
                      {stock.Symbol}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs sm:px-4 sm:text-sm">
                      {quote ? (
                        quote.cmp > 0 ? quote.cmp.toFixed(2) : '-'
                      ) : (
                        <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs sm:px-4 sm:text-sm hidden sm:table-cell">
                      {quote ? (
                        quote.cmp > 0 ? (
                          <span className={`inline-flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(quote.percentChange).toFixed(2)}%
                          </span>
                        ) : '-'
                      ) : (
                        <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-sm text-muted-foreground font-mono">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loadingQuotes}
              className="p-2 rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loadingQuotes}
              className="p-2 rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
