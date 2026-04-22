import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StockTable } from '@/components/StockTable';
import { StockSearchBar } from '@/components/StockSearchBar';
import { TradingTypeSelector } from '@/components/TradingTypeSelector';
import { TradingPlanCard } from '@/components/TradingPlanCard';
import { IntelligenceDashboard } from '@/components/IntelligenceDashboard';
import { LiveEngine } from '@/components/LiveEngine';
import { computeCPRForTimeframe, getCPRWidth, getCPRTrend, getTwoDayRelation } from '@/lib/cpr';
import { fetchDailyCandles, fetchStockData } from '@/lib/yahoo-finance';
import { generateTradingPlan } from '@/lib/trading-plan';
import type { TradingType, CPRWidth, TwoDayRelation, StockData, CPRValues, TradingPlan } from '@/types/trading';
import { Zap, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

export default function Index() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [tradingType, setTradingType] = useState<TradingType | null>(null);

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [cprValues, setCprValues] = useState<CPRValues | null>(null);
  const [priorCprValues, setPriorCprValues] = useState<CPRValues | null>(null);
  const [currentPeriodCandles, setCurrentPeriodCandles] = useState<import('@/types/trading').DailyCandle[]>([]);
  const [cprWidth, setCprWidth] = useState<CPRWidth | null>(null);
  const [twoDayRelation, setTwoDayRelation] = useState<TwoDayRelation | null>(null);
  const [plan, setPlan] = useState<TradingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'live' | 'plan' | 'analysis'>('plan');


  const handleSelectStock = useCallback(async (symbol: string) => {
    setSelectedSymbol(symbol);
    const type: TradingType = 'positional'; // Auto-select positional to show trade plan immediately
    setTradingType(type);
    setStockData(null);
    setCprValues(null);
    setPlan(null);
    setError(null);
    setLoading(true);

    try {
      const [sd, candles] = await Promise.all([
        fetchStockData(symbol),
        fetchDailyCandles(symbol, type),
      ]);
      setStockData(sd);

      const result = computeCPRForTimeframe(candles, type);
      if (!result) throw new Error('Could not compute CPR — insufficient data');

      setCprValues(result.cpr);
      setPriorCprValues(result.priorCPR);
      setCurrentPeriodCandles(result.currentPeriodCandles);
      setCprWidth(getCPRWidth(result.cpr.tc, result.cpr.bc, sd.cmp));
      setTwoDayRelation(getTwoDayRelation(candles));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setStockData(null);
      setCprValues(null);
      setPriorCprValues(null);
      setCurrentPeriodCandles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTradingTypeChange = useCallback(async (type: TradingType) => {
    if (!selectedSymbol) return;
    setTradingType(type);
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const [sd, candles] = await Promise.all([
        fetchStockData(selectedSymbol),
        fetchDailyCandles(selectedSymbol, type),
      ]);
      setStockData(sd);

      const result = computeCPRForTimeframe(candles, type);
      if (!result) throw new Error('Could not compute CPR — insufficient data');

      setCprValues(result.cpr);
      setPriorCprValues(result.priorCPR);
      setCurrentPeriodCandles(result.currentPeriodCandles);
      setCprWidth(getCPRWidth(result.cpr.tc, result.cpr.bc, sd.cmp));
      setTwoDayRelation(getTwoDayRelation(candles));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setStockData(null);
      setCprValues(null);
      setPriorCprValues(null);
      setCurrentPeriodCandles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  // Generate plan
  useEffect(() => {
    if (!cprValues || !stockData || !cprWidth || !twoDayRelation || !tradingType) {
      setPlan(null);
      return;
    }
    const cprTrend = getCPRTrend(cprValues.pivot, stockData.prevClose);
    setPlan(generateTradingPlan(cprValues, stockData, cprWidth, twoDayRelation, cprTrend, tradingType, priorCprValues, currentPeriodCandles));
  }, [cprValues, priorCprValues, currentPeriodCandles, stockData, cprWidth, twoDayRelation, tradingType]);

  const timeframeLabel = tradingType === 'positional' ? 'Monthly' : tradingType === 'longterm' ? 'Yearly' : '';
  const hasResults = stockData && cprValues && !loading;

  const handleReset = useCallback(() => {
    setSelectedSymbol(null);
    setTradingType(null);
    setStockData(null);
    setCprValues(null);
    setPlan(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-background relative flex flex-col font-sans">
      <div className="ambient-glow" />
      <div className="ambient-glow-secondary" />
      <div className="soft-grid" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-white/[0.05] bg-background/50 backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(20,250,150,0.15)]">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-heading tracking-tight text-foreground leading-none flex items-center gap-2">
              CPR ALPHA
            </h1>
            <span className="text-[10px] font-mono text-muted-foreground mt-1">v2.0 PREDICTIVE ENGINE</span>
          </div>
        </div>
        <AnimatePresence>
          {selectedSymbol && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={handleReset}
              className="text-xs font-semibold px-4 py-2 border border-white/[0.1] hover:bg-white/[0.05] rounded-full transition-colors flex items-center gap-2"
            >
              Start Over
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 w-full max-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!tradingType && !loading && (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center pt-4 sm:pt-6 max-w-2xl mx-auto w-full text-center space-y-10"
            >
              

              <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative group border-white/[0.08]">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                
                <AnimatePresence mode="wait">
                  {!selectedSymbol ? (
                    <motion.div 
                      key="search-box"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-left space-y-3 relative z-10 max-h-[60vh] overflow-y-auto"
                    >
                      <label className="text-xs font-semibold text-foreground/70 uppercase tracking-widest flex items-center gap-3 mb-4">
                        <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold flex items-center justify-center">1</span>
                        Select Asset
                      </label>
                      
                      {/* Search Bar */}
                      <div className="mb-6">
                        <StockSearchBar onSelect={handleSelectStock} />
                      </div>
                      
                      {/* Or browse table */}
                      <div className="text-center mb-4">
                        <span className="text-xs text-muted-foreground font-mono">or browse all stocks</span>
                      </div>
                      
                      <StockTable onSelect={handleSelectStock} />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="horizon-box"
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="text-left space-y-6 relative z-10"
                    >
                      <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] p-4 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Selected Asset</span>
                          <span className="text-xl font-bold text-primary font-mono">{selectedSymbol}</span>
                        </div>
                        <button onClick={() => setSelectedSymbol(null)} className="text-xs text-muted-foreground hover:text-foreground underline decoration-muted-foreground/30 underline-offset-4">
                          Change
                        </button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-widest flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold flex items-center justify-center">2</span>
                          Select Horizon
                        </label>
                        <TradingTypeSelector tradingType={tradingType} onTradingTypeChange={handleTradingTypeChange} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {(loading || hasResults || error) && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col space-y-6 w-full"
            >
              {loading && (
                <div className="flex flex-col items-center justify-center py-32 min-h-[400px]">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                     <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <span className="mt-8 font-medium text-lg text-foreground/80 animate-pulse font-heading tracking-wide">
                    Analyzing Market Structure...
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">Computing {timeframeLabel} CPR for {selectedSymbol}</span>
                </div>
              )}

              {error && !loading && (
                <div className="glass-panel p-6 rounded-2xl border-destructive/30 bg-destructive/5 flex items-start gap-4 text-destructive">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg">Analysis Failed</h3>
                    <p className="opacity-90 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {hasResults && (
                <div className="w-full">
                  {/* Desktop Tabs */}
                  <div className="hidden xl:flex items-center bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 mb-6 max-w-4xl mx-auto w-full">
                    <button
                      onClick={() => setMobileTab('live')}
                      className={`flex-1 text-sm font-semibold py-3 rounded-lg transition-colors ${mobileTab === 'live' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Live Market
                    </button>
                    <button
                      onClick={() => setMobileTab('plan')}
                      className={`flex-1 text-sm font-semibold py-3 rounded-lg transition-colors ${mobileTab === 'plan' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Trading Plan
                    </button>
                    <button
                      onClick={() => setMobileTab('analysis')}
                      className={`flex-1 text-sm font-semibold py-3 rounded-lg transition-colors ${mobileTab === 'analysis' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Intelligence Analysis
                    </button>
                  </div>

                  {/* Mobile Tabs */}
                  <div className="xl:hidden flex items-center bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 mb-6 max-w-4xl mx-auto w-full">
                    <button
                      onClick={() => setMobileTab('live')}
                      className={`flex-1 text-xs font-semibold py-2.5 rounded-lg transition-colors ${mobileTab === 'live' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Live
                    </button>
                    <button
                      onClick={() => setMobileTab('plan')}
                      className={`flex-1 text-xs font-semibold py-2.5 rounded-lg transition-colors ${mobileTab === 'plan' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Plan
                    </button>
                    <button
                      onClick={() => setMobileTab('analysis')}
                      className={`flex-1 text-xs font-semibold py-2.5 rounded-lg transition-colors ${mobileTab === 'analysis' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Analysis
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="w-full max-w-4xl mx-auto">
                    {mobileTab === 'live' && plan && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-4xl mx-auto"
                      >
                        <LiveEngine
                          symbol={stockData.symbol}
                          cpr={cprValues}
                          priorCpr={priorCprValues}
                          plan={plan}
                          stock={stockData}
                          onCmpUpdate={(cmp) => setStockData((prev) => (prev ? { ...prev, cmp } : prev))}
                        />
                      </motion.div>
                    )}

                    {mobileTab === 'plan' && plan && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-4xl mx-auto"
                      >
                        <TradingPlanCard plan={plan} />
                      </motion.div>
                    )}

                    {mobileTab === 'analysis' && plan && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-4xl mx-auto"
                      >
                        <IntelligenceDashboard
                          plan={plan}
                          cpr={cprValues}
                          priorCpr={priorCprValues}
                          stock={stockData}
                          width={cprWidth}
                          currentPeriodCandles={currentPeriodCandles}
                          tradingType={tradingType!}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
