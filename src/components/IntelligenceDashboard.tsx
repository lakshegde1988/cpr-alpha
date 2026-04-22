import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Crosshair,
  Gauge,
  Layers,
  MinusCircle,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import type { TradingPlan, CPRValues, StockData, CPRWidth, DailyCandle, TradingType } from '@/types/trading';
import {
  computeIntelligence,
  biasColorClass,
  biasBgClass,
  biasLabel,
  type QualityLabel,
} from '@/lib/intelligence';
import { calculateCPR } from '@/lib/cpr';

interface Props {
  plan: TradingPlan;
  cpr: CPRValues;
  priorCpr: CPRValues | null;
  stock: StockData;
  width: CPRWidth | null;
  currentPeriodCandles: DailyCandle[];
  tradingType: TradingType;
}

function qualityStyle(q: QualityLabel) {
  switch (q) {
    case 'A+ Setup':
      return { color: 'text-bullish', bg: 'bg-bullish/15 border-bullish/40', icon: <Sparkles className="w-4 h-4" /> };
    case 'Strong Setup':
      return { color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/30', icon: <CheckCircle2 className="w-4 h-4" /> };
    case 'Moderate Setup':
      return { color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', icon: <Activity className="w-4 h-4" /> };
    default:
      return { color: 'text-bearish', bg: 'bg-bearish/10 border-bearish/30', icon: <XCircle className="w-4 h-4" /> };
  }
}

function statusStyle(status: 'CONFIRMED' | 'FAILED' | 'NEUTRAL') {
  if (status === 'CONFIRMED') return { color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  if (status === 'FAILED') return { color: 'text-bearish', bg: 'bg-bearish/10 border-bearish/30', icon: <XCircle className="w-3.5 h-3.5" /> };
  return { color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', icon: <MinusCircle className="w-3.5 h-3.5" /> };
}

function directionStyle(d: 'LONG' | 'SHORT' | 'NONE') {
  if (d === 'LONG') return { color: 'text-bullish', bg: 'bg-bullish/15 border-bullish/40', icon: <ArrowUpCircle className="w-5 h-5" />, label: 'LONG' };
  if (d === 'SHORT') return { color: 'text-bearish', bg: 'bg-bearish/15 border-bearish/40', icon: <ArrowDownCircle className="w-5 h-5" />, label: 'SHORT' };
  return { color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', icon: <MinusCircle className="w-5 h-5" />, label: 'NO TRADE' };
}

export function IntelligenceDashboard({ plan, cpr, priorCpr, stock, width, currentPeriodCandles, tradingType }: Props) {
  const period = tradingType === 'positional' ? 'monthly' : 'yearly';
  const insight = computeIntelligence(plan, cpr, priorCpr, stock, width, period);
  const qStyle = qualityStyle(insight.qualityLabel);
  const sStyle = statusStyle(insight.biasStatus);
  const dStyle = directionStyle(insight.direction);

  const periodLabel = tradingType === 'positional' ? 'Monthly' : 'Yearly';

  // Today's daily CPR (from yesterday's daily candle) + today's action
  const sortedDaily = [...currentPeriodCandles].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const todayCandle = sortedDaily[sortedDaily.length - 1] ?? null;
  const yesterdayCandle = sortedDaily[sortedDaily.length - 2] ?? null;
  const dailyCPR = yesterdayCandle
    ? calculateCPR(yesterdayCandle.high, yesterdayCandle.low, yesterdayCandle.close)
    : null;
  const dailyChangePct = todayCandle
    ? ((todayCandle.close - todayCandle.open) / todayCandle.open) * 100
    : null;
  const cmpVsDailyCPR = dailyCPR
    ? stock.cmp > dailyCPR.tc
      ? 'Above CPR'
      : stock.cmp < dailyCPR.bc
        ? 'Below CPR'
        : 'Inside CPR'
    : '—';

  const scorePct = (insight.confidenceScore / 10) * 100;
  const scoreColor =
    insight.confidenceScore >= 9
      ? 'bg-bullish'
      : insight.confidenceScore >= 7
        ? 'bg-bullish/70'
        : insight.confidenceScore >= 5
          ? 'bg-neutral'
          : 'bg-bearish';

  return (
    <div className="space-y-4">
      {/* === ALERTS === */}
      {(insight.lowConvictionWarning || insight.highProbabilityFlag || insight.reversalWarning) && (
        <div className="space-y-2">
          {insight.highProbabilityFlag && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg border border-bullish/40 bg-bullish/10"
            >
              <Zap className="w-4 h-4 text-bullish shrink-0" />
              <div className="text-xs sm:text-sm font-mono text-bullish">
                <span className="font-bold">Potential Trend Month</span> — Narrow CPR + Bias Confirmed
              </div>
            </motion.div>
          )}
          {insight.lowConvictionWarning && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg border border-neutral/40 bg-neutral/10"
            >
              <AlertTriangle className="w-4 h-4 text-neutral shrink-0" />
              <div className="text-xs sm:text-sm font-mono text-neutral">
                <span className="font-bold">Low Conviction</span> — Wide CPR with confidence &lt; 6. Consider avoiding trades.
              </div>
            </motion.div>
          )}
          {insight.reversalWarning && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg border border-bearish/40 bg-bearish/10"
            >
              <ShieldAlert className="w-4 h-4 text-bearish shrink-0" />
              <div className="text-xs sm:text-sm font-mono text-bearish">
                <span className="font-bold">Bias Failed</span> — Price moved against initial bias. See alternate plan below.
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* === MARKET CONTEXT (Monthly / Yearly CPR) === */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-info" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Market Context
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Relationship</div>
            <div className="text-sm font-mono font-semibold mt-0.5">{insight.relationshipLabel}</div>
          </div>
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Width</div>
            <div className="text-sm font-mono font-semibold mt-0.5">{insight.widthLabel}</div>
          </div>
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Expectation</div>
            <div className="text-sm font-mono font-semibold mt-0.5">{insight.expectedDayType}</div>
          </div>
        </div>
      </motion.section>

      {/* === TODAY'S MARKET ACTION (Daily) === */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Today's Market Action — Daily CPR
          </h3>
        </div>
        {dailyCPR && todayCandle ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Open</div>
                <div className="text-xs font-mono font-semibold">{todayCandle.open.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">High</div>
                <div className="text-xs font-mono font-semibold text-bullish">{todayCandle.high.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Low</div>
                <div className="text-xs font-mono font-semibold text-bearish">{todayCandle.low.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Close / CMP</div>
                <div className={`text-xs font-mono font-semibold ${dailyChangePct !== null && dailyChangePct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {todayCandle.close.toFixed(2)}
                  {dailyChangePct !== null && (
                    <span className="ml-1 text-[9px]">({dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Daily TC</div>
                <div className="text-xs font-mono font-semibold">{dailyCPR.tc.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Daily Pivot</div>
                <div className="text-xs font-mono font-semibold text-primary">{dailyCPR.pivot.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-[9px] uppercase font-mono text-muted-foreground">Daily BC</div>
                <div className="text-xs font-mono font-semibold">{dailyCPR.bc.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">CMP vs Daily CPR</span>
              <span className={`text-xs font-mono font-bold ${
                cmpVsDailyCPR === 'Above CPR' ? 'text-bullish' :
                cmpVsDailyCPR === 'Below CPR' ? 'text-bearish' : 'text-neutral'
              }`}>
                {cmpVsDailyCPR}
              </span>
            </div>
          </>
        ) : (
          <div className="text-xs font-mono text-muted-foreground text-center py-4">
            Insufficient daily candles to compute today's CPR
          </div>
        )}
      </motion.section>

      {/* === TRADE PLANS (2 COLUMN LAYOUT) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* === PRIMARY TRADE PLAN === */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${dStyle.bg}`}>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Primary Trade Plan</h3>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold ${dStyle.color} bg-card/60`}>
              {dStyle.icon}
              {dStyle.label}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <PlanRow icon={<Crosshair className="w-3.5 h-3.5 text-primary" />} label="Entry Zone" value={plan.entryZone} />
            <PlanRow icon={<Zap className="w-3.5 h-3.5 text-info" />} label="Entry Trigger" value={'Daily candle close confirmation in entry zone'} />
            <PlanRow icon={<ShieldAlert className="w-3.5 h-3.5 text-bearish" />} label="Stop Loss" value={plan.stopLoss} />
            <div className="flex gap-3">
              <Target className="w-3.5 h-3.5 text-bullish mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Targets</div>
                <div className="space-y-0.5">
                  {plan.targets.map((t, i) => (
                    <div key={i} className="text-sm font-mono break-words">{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* === ALTERNATE PLAN === */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-card border rounded-lg overflow-hidden ${insight.reversalWarning ? 'border-bearish/40 ring-1 ring-bearish/30' : 'border-border'}`}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap bg-secondary/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${insight.reversalWarning ? 'text-bearish' : 'text-neutral'}`} />
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Alternate Plan</h3>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold ${directionStyle(insight.alternatePlan.direction).color} bg-card/60`}>
              {directionStyle(insight.alternatePlan.direction).icon}
              {directionStyle(insight.alternatePlan.direction).label}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <PlanRow icon={<Zap className="w-3.5 h-3.5 text-info" />} label="Trigger" value={insight.alternatePlan.trigger} />
            <PlanRow icon={<Crosshair className="w-3.5 h-3.5 text-primary" />} label="Entry" value={insight.alternatePlan.entry} />
            <PlanRow icon={<ShieldAlert className="w-3.5 h-3.5 text-bearish" />} label="Stop Loss" value={insight.alternatePlan.stopLoss} />
            <PlanRow icon={<Target className="w-3.5 h-3.5 text-bullish" />} label="Target" value={insight.alternatePlan.target} />
          </div>
        </motion.section>
      </div>

      {/* === CONFIDENCE & QUALITY === */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-lg p-4 ${qStyle.bg}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Gauge className={`w-4 h-4 ${qStyle.color}`} />
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Confidence & Quality</h3>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold ${qStyle.color} bg-card/60 border border-current/30`}>
            {qStyle.icon}
            {insight.qualityLabel}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-mono font-bold ${qStyle.color}`}>{insight.confidenceScore}<span className="text-sm text-muted-foreground">/10</span></div>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${scorePct}%` }}
              className={`h-full ${scoreColor}`}
            />
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function PlanRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}
