import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Radio,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { fetchLiveQuote } from '@/lib/yahoo-finance';
import {
  buildSignalFromStatus,
  computeScenarioStatus,
  getMarketState,
  scenarioKindFromBias,
  type LiveSignal,
  type MarketState,
  type ScenarioStatus,
} from '@/lib/live-engine';
import type { CPRValues, TradingPlan, StockData } from '@/types/trading';
import { toast } from 'sonner';

interface Props {
  symbol: string;
  cpr: CPRValues;
  priorCpr: CPRValues | null;
  plan: TradingPlan;
  stock: StockData;
  onCmpUpdate: (cmp: number) => void;
}

function marketStateStyle(s: MarketState) {
  if (s === 'ABOVE_VALUE') return { color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/30', label: 'Above Value' };
  if (s === 'BELOW_VALUE') return { color: 'text-bearish', bg: 'bg-bearish/10 border-bearish/30', label: 'Below Value' };
  return { color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', label: 'Inside Value' };
}

function statusStyle(s: ScenarioStatus) {
  switch (s) {
    case 'ENTRY_TRIGGERED':
    case 'BREAKOUT_TRIGGERED':
      return { color: 'text-bullish', bg: 'bg-bullish/15 border-bullish/40', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    case 'INVALIDATED':
    case 'FAILED_BREAKOUT':
      return { color: 'text-bearish', bg: 'bg-bearish/15 border-bearish/40', icon: <ShieldAlert className="w-3.5 h-3.5" /> };
    case 'PULLBACK_ACTIVE':
    case 'RALLY_ACTIVE':
      return { color: 'text-info', bg: 'bg-info/10 border-info/30', icon: <Activity className="w-3.5 h-3.5" /> };
    default:
      return { color: 'text-muted-foreground', bg: 'bg-secondary/50 border-border', icon: <Radio className="w-3.5 h-3.5" /> };
  }
}

function statusLabel(s: ScenarioStatus) {
  return s.replace(/_/g, ' ');
}

export function LiveEngine({ symbol, cpr, priorCpr, plan, stock, onCmpUpdate }: Props) {
  const [cmp, setCmp] = useState<number>(stock.cmp);
  const [prevCmp, setPrevCmp] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<number>(Date.now());
  const [syncing, setSyncing] = useState(false);
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const lastSignalKeyRef = useRef<string | null>(null);

  const kind = scenarioKindFromBias(plan.bias, plan.signal);
  const marketState = getMarketState(cmp, cpr);
  const status = computeScenarioStatus(kind, cpr, priorCpr, cmp, prevCmp);
  const msStyle = marketStateStyle(marketState);
  const stStyle = statusStyle(status);

  // Reset state when symbol/plan changes
  useEffect(() => {
    setCmp(stock.cmp);
    setPrevCmp(null);
    setSignals([]);
    setLastSync(Date.now());
    lastSignalKeyRef.current = null;
  }, [symbol, plan.bias, plan.signal, stock.cmp]);

  // Emit signals when status transitions to a triggering state
  useEffect(() => {
    const triggerStates: ScenarioStatus[] = ['ENTRY_TRIGGERED', 'BREAKOUT_TRIGGERED', 'INVALIDATED', 'FAILED_BREAKOUT'];
    if (!triggerStates.includes(status)) return;
    const key = `${status}-${kind}`;
    if (lastSignalKeyRef.current === key) return;
    const sig = buildSignalFromStatus(status, kind, cmp, priorCpr);
    if (!sig) return;
    lastSignalKeyRef.current = key;
    setSignals((prev) => [sig, ...prev].slice(0, 8));
    if (sig.type === 'ENTRY') toast.success(`${sig.direction} signal · ₹${sig.price.toFixed(2)}`, { description: sig.reason });
    else toast.error('Exit / Switch', { description: sig.reason });
  }, [status, kind, cmp, priorCpr]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const quote = await fetchLiveQuote(symbol);
      setPrevCmp(cmp);
      setCmp(quote.cmp);
      setLastSync(quote.ts || Date.now());
      onCmpUpdate(quote.cmp);
    } catch (err: any) {
      toast.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const change = cmp - stock.prevClose;
  const changePct = (change / stock.prevClose) * 100;
  const isUp = change >= 0;
  const lastSyncStr = new Date(lastSync).toLocaleTimeString();

  // Period OHLC + S/R rows used for the merged levels view
  const ohlcItems = [
    { l: 'Open', v: cpr.open },
    { l: 'High', v: cpr.high },
    { l: 'Low', v: cpr.low },
    { l: 'Close', v: cpr.close },
  ];

  const levels = [
    { label: 'R3', value: cpr.r3, color: 'text-bullish' },
    { label: 'R2', value: cpr.r2, color: 'text-bullish' },
    { label: 'R1', value: cpr.r1, color: 'text-bullish' },
    { label: 'TC', value: cpr.tc, color: 'text-bullish' },
    { label: 'Pivot', value: cpr.pivot, color: 'text-neutral' },
    { label: 'BC', value: cpr.bc, color: 'text-bearish' },
    { label: 'S1', value: cpr.s1, color: 'text-bearish' },
    { label: 'S2', value: cpr.s2, color: 'text-bearish' },
    { label: 'S3', value: cpr.s3, color: 'text-bearish' },
  ];
  const range = cpr.r3 - cpr.s3;
  const cmpPct = range > 0 ? ((cmp - cpr.s3) / range) * 100 : 50;
  const widthPct = ((cpr.tc - cpr.bc) / cmp) * 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg overflow-hidden card-glow"
    >
      {/* Header with live CMP + sync */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Live Engine · Pivot Levels</h3>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync CMP
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Symbol + CMP block */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-bold font-mono terminal-glow">{symbol}</div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground mt-1">Current Market Price</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono terminal-glow">₹{cmp.toFixed(2)}</span>
              <span className={`flex items-center gap-1 text-xs font-mono ${isUp ? 'text-bullish' : 'text-bearish'}`}>
                {isUp ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                {Math.abs(change).toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">Last sync: {lastSyncStr}</div>
          </div>
          <div className={`px-3 py-1.5 rounded border font-mono text-xs font-bold ${msStyle.bg} ${msStyle.color}`}>
            {msStyle.label}
          </div>
        </div>

        {/* Scenario tracker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Scenario</div>
            <div className="text-sm font-mono font-bold mt-0.5 capitalize">
              {kind === 'NONE' ? 'No Active Scenario' : kind.toLowerCase()}
            </div>
          </div>
          <div className={`rounded p-3 border ${stStyle.bg}`}>
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Status</div>
            <div className={`text-sm font-mono font-bold mt-0.5 flex items-center gap-1.5 ${stStyle.color}`}>
              {stStyle.icon}
              {statusLabel(status)}
            </div>
          </div>
        </div>

        {/* Period OHLC */}
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
            Period OHLC ({cpr.periodStart} → {cpr.periodEnd})
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ohlcItems.map((d) => (
              <div key={d.l} className="bg-secondary/50 rounded p-2">
                <div className="text-[10px] uppercase text-muted-foreground font-mono">{d.l}</div>
                <div className="text-xs font-mono font-semibold">₹{d.v.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pivot / S/R levels with CMP marker */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">CPR & Pivot S/R Levels</div>
          {levels.map((item) => {
            const pct = range > 0 ? ((item.value - cpr.s3) / range) * 100 : 50;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`text-xs font-mono w-12 ${item.color}`}>{item.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, pct))}%` }}
                    className="h-full bg-primary/50 rounded-full"
                  />
                </div>
                <span className="text-xs font-mono font-semibold w-20 text-right">₹{item.value.toFixed(2)}</span>
              </div>
            );
          })}
          {/* CMP marker (live) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono w-12 text-info">CMP</span>
            <div className="flex-1 h-2 bg-secondary rounded-full relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, Math.min(100, cmpPct))}%` }}
                className="h-full bg-info/50 rounded-full"
              />
            </div>
            <span className="text-xs font-mono font-semibold w-20 text-right text-info">₹{cmp.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-4 text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/50">
          <span>Period: {cpr.periodStart} → {cpr.periodEnd}</span>
          <span>Width: {widthPct.toFixed(3)}%</span>
        </div>

        {/* Signal feed */}
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Signal Feed
          </div>
          {signals.length === 0 ? (
            <div className="text-xs font-mono text-muted-foreground/60 italic px-2 py-3 text-center bg-secondary/30 rounded">
              No signals yet — sync CMP to start tracking
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {signals.map((s) => {
                  const isEntry = s.type === 'ENTRY';
                  const dirColor = s.direction === 'LONG' ? 'text-bullish' : s.direction === 'SHORT' ? 'text-bearish' : 'text-muted-foreground';
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 p-2 rounded text-xs font-mono border ${
                        isEntry ? 'border-bullish/30 bg-bullish/5' : 'border-bearish/30 bg-bearish/5'
                      }`}
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isEntry ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'}`}>
                        {isEntry ? 'ENTRY' : 'EXIT'}
                      </span>
                      {s.direction !== 'NONE' && <span className={`font-bold ${dirColor}`}>{s.direction}</span>}
                      <span className="font-semibold">₹{s.price.toFixed(2)}</span>
                      <span className="text-muted-foreground truncate">· {s.reason}</span>
                      <span className="ml-auto text-[9px] text-muted-foreground/60 shrink-0">
                        {new Date(s.ts).toLocaleTimeString()}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
