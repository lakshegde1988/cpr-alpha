import { motion } from 'framer-motion';
import type { TradingPlan as TPlan, Bias, Signal } from '@/types/trading';
import { Target, Shield, Crosshair, MessageSquare, TrendingUp, TrendingDown, Minus, Activity, Brain, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TradingPlanCardProps {
  plan: TPlan;
}

function biasMeta(bias: Bias) {
  switch (bias) {
    case 'STRONG_BULLISH':
      return { label: 'Strong Bullish', color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/30', icon: <TrendingUp className="w-5 h-5" /> };
    case 'MODERATE_BULLISH':
      return { label: 'Moderate Bullish', color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/20', icon: <TrendingUp className="w-5 h-5" /> };
    case 'STRONG_BEARISH':
      return { label: 'Strong Bearish', color: 'text-bearish', bg: 'bg-bearish/10 border-bearish/30', icon: <TrendingDown className="w-5 h-5" /> };
    case 'MODERATE_BEARISH':
      return { label: 'Moderate Bearish', color: 'text-bearish', bg: 'bg-bearish/10 border-bearish/20', icon: <TrendingDown className="w-5 h-5" /> };
    case 'RANGE_BREAKOUT_SETUP':
      return { label: 'Range Breakout Setup', color: 'text-info', bg: 'bg-info/10 border-info/30', icon: <Activity className="w-5 h-5" /> };
    case 'HIGH_CONVICTION_BREAKOUT':
      return { label: 'High Conviction Breakout', color: 'text-primary', bg: 'bg-primary/10 border-primary/30', icon: <Activity className="w-5 h-5" /> };
    case 'SIDEWAYS_MONTH':
      return { label: 'Sideways Period', color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', icon: <Minus className="w-5 h-5" /> };
    default:
      return { label: 'Neutral', color: 'text-neutral', bg: 'bg-neutral/10 border-neutral/30', icon: <Minus className="w-5 h-5" /> };
  }
}

function signalLabel(s: Signal) {
  return s.replace(/_/g, ' ');
}

function signalColor(s: Signal) {
  if (s.includes('BUY')) return 'text-bullish';
  if (s.includes('SELL')) return 'text-bearish';
  return 'text-muted-foreground';
}

export function TradingPlanCard({ plan }: TradingPlanCardProps) {
  const meta = biasMeta(plan.bias);
  const sigColor = signalColor(plan.signal);
  const marketTypeLabel = plan.marketType === 'TREND_MONTH' ? 'Trend' : plan.marketType === 'RANGE_MONTH' ? 'Range' : 'Normal';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b ${meta.bg}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={meta.color}>{meta.icon}</span>
            <div>
              <h3 className={`text-base sm:text-lg font-bold font-mono uppercase ${meta.color}`}>{meta.label}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                <span className="text-xs font-mono text-muted-foreground">
                  Market: <span className="text-foreground">{marketTypeLabel}</span>
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Signal: <span className={`font-semibold ${sigColor}`}>{signalLabel(plan.signal)}</span>
                </span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase bg-secondary ${sigColor}`}>
            {signalLabel(plan.signal)}
          </div>
        </div>
      </div>

        {/* First-day override / invalidation banner */}
      {(plan.firstDayOverrideApplied || plan.biasValidity === 'INVALIDATED') && (
        <div className={`px-5 py-4 border-b border-white/[0.05] space-y-3 ${
          plan.biasValidity === 'INVALIDATED'
            ? 'bg-bearish/10'
            : plan.firstDayOverride === 'BULLISH'
            ? 'bg-bullish/10'
            : 'bg-bearish/10'
        }`}>
          {plan.firstDayOverrideApplied && (
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-md ${plan.firstDayOverride === 'BULLISH' ? 'bg-bullish/20' : 'bg-bearish/20'}`}>
                <Lock className={`w-4 h-4 ${plan.firstDayOverride === 'BULLISH' ? 'text-bullish' : 'text-bearish'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-foreground">
                    Previous Month Close Bias
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    plan.firstDayOverride === 'BULLISH' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                  }`}>
                    APPLIED · {plan.firstDayOverride}
                  </span>
                  {plan.firstDayCloseDate && (
                    <span className="text-[10px] font-mono text-muted-foreground">{plan.firstDayCloseDate}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Initial CPR bias was <span className="font-semibold text-foreground px-1 py-0.5 rounded bg-white/[0.05]">{plan.initialBias.replace(/_/g, ' ')}</span> — overridden by first-day close vs CPR.
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 pl-1">
            {plan.biasValidity === 'INVALIDATED' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-bearish shrink-0" />
                <span className="text-[10px] font-mono uppercase font-bold text-bearish">Bias Invalidated</span>
                <span className="text-xs text-foreground truncate">{plan.invalidationReason}</span>
              </>
            ) : plan.firstDayOverrideApplied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-bullish shrink-0" />
                <span className="text-[10px] font-mono uppercase font-bold text-bullish">Bias Still Valid</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="p-5 md:p-6 space-y-6">
        
        {/* Core Execution Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Entry */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col items-start gap-2 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry Zone</div>
            </div>
            <div className="text-sm font-medium text-foreground leading-relaxed z-10">{plan.entryZone}</div>
          </div>

          {/* Stop Loss */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col items-start gap-2 relative overflow-hidden group hover:border-bearish/30 transition-colors">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-bearish" />
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stop Loss</div>
            </div>
            <div className="text-sm font-medium text-foreground leading-relaxed z-10">{plan.stopLoss}</div>
          </div>

          {/* Targets */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col items-start gap-2 relative overflow-hidden group hover:border-bullish/30 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-bullish" />
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Targets</div>
            </div>
            <div className="flex flex-col gap-1.5 w-full z-10">
              {plan.targets.map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.03] px-2 py-1.5 rounded-lg border border-white/[0.02]">
                   <span className="text-[10px] bg-bullish/20 text-bullish w-4 h-4 flex items-center justify-center rounded-sm font-bold">T{i+1}</span>
                   <span className="text-sm font-mono font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Reasoning */}
        {plan.reasoning.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded bg-primary/10">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Analytical Reasoning</h4>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
              {plan.reasoning.map((r, i) => (
                <li key={i} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.03] p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(20,250,150,0.5)]" />
                  <span className="text-sm text-foreground/90 leading-relaxed font-light">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {plan.notes.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 rounded bg-info/10">
                <MessageSquare className="w-4 h-4 text-info" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Trade Management</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 pl-1">
               {plan.notes.map((n, i) => (
                <div key={i} className="flex items-start gap-3 bg-info/5 border border-info/10 p-3 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-info mt-2 shrink-0 shadow-[0_0_8px_rgba(50,150,255,0.5)]" />
                  <span className="text-sm text-foreground/90 leading-relaxed font-light">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
