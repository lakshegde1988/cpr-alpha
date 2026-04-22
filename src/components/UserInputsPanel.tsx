import { motion } from 'framer-motion';
import type { CPRWidth, TwoDayRelation } from '@/types/trading';

const twoDayOptions: { value: TwoDayRelation; label: string }[] = [
  { value: 'higher_value_higher', label: 'Higher Value Higher' },
  { value: 'higher_value_lower', label: 'Higher Value Lower' },
  { value: 'lower_value_higher', label: 'Lower Value Higher' },
  { value: 'lower_value_lower', label: 'Lower Value Lower' },
  { value: 'overlapping_higher', label: 'Overlapping Higher' },
  { value: 'overlapping_lower', label: 'Overlapping Lower' },
  { value: 'unchanged', label: 'Unchanged' },
];

interface UserInputsPanelProps {
  cprWidth: CPRWidth | null;
  twoDayRelation: TwoDayRelation | null;
  onCPRWidthChange: (w: CPRWidth) => void;
  onTwoDayRelationChange: (r: TwoDayRelation) => void;
}

export function UserInputsPanel({ cprWidth, twoDayRelation, onCPRWidthChange, onTwoDayRelationChange }: UserInputsPanelProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
        Step 4 — Analysis Parameters
      </h3>

      <div>
        <label className="text-xs font-mono text-muted-foreground mb-2 block">CPR Width</label>
        <div className="flex gap-2">
          {(['narrow', 'moderate', 'wide'] as CPRWidth[]).map((w) => (
            <button
              key={w}
              onClick={() => onCPRWidthChange(w)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize transition-all ${
                cprWidth === w
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-muted-foreground mb-2 block">Two-Day Relationship</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {twoDayOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => onTwoDayRelationChange(o.value)}
              className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                twoDayRelation === o.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
