import { motion } from 'framer-motion';
import type { TradingType } from '@/types/trading';
import { BarChart3, Calendar } from 'lucide-react';

const tradingTypes: { value: TradingType; label: string; desc: string }[] = [
  { value: 'positional', label: 'Positional', desc: 'Monthly CPR' },
  { value: 'longterm', label: 'Long Term', desc: 'Yearly CPR' },
];

interface TradingTypeSelectorProps {
  tradingType: TradingType | null;
  onTradingTypeChange: (t: TradingType) => void;
}

export function TradingTypeSelector({ tradingType, onTradingTypeChange }: TradingTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {tradingTypes.map((t) => (
        <button
          key={t.value}
          onClick={() => onTradingTypeChange(t.value)}
          className={`flex-1 px-3 py-3 rounded-lg text-center transition-all border ${
            tradingType === t.value
              ? 'border-primary bg-primary/10'
              : 'border-border bg-secondary/50 hover:border-muted-foreground/40'
          }`}
        >
          <div className={`text-xs font-mono font-semibold ${tradingType === t.value ? 'text-primary' : 'text-foreground'}`}>
            {t.label}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}
