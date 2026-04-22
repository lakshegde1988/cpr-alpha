import type { CPRValues, StockData } from '@/types/trading';

export type PivotZone = 
  | 'ABOVE_R3'
  | 'ABOVE_R2' 
  | 'ABOVE_R1'
  | 'ABOVE_TC'
  | 'INSIDE_CPR'
  | 'BELOW_BC'
  | 'BELOW_S1'
  | 'BELOW_S2'
  | 'BELOW_S3';

export interface DynamicTarget {
  zone: PivotZone;
  targetLevel: string;
  targetValue: number;
  reasoning: string;
  cmp: number;
}

/**
 * Determine the current CMP position relative to Floor Pivot levels
 */
export function determinePivotZone(cmp: number, cpr: CPRValues): PivotZone {
  const { bc, tc, r1, r2, r3, s1, s2, s3 } = cpr;
  
  if (cmp > r3) return 'ABOVE_R3';
  if (cmp > r2) return 'ABOVE_R2';
  if (cmp > r1) return 'ABOVE_R1';
  if (cmp > tc) return 'ABOVE_TC';
  if (cmp >= bc) return 'INSIDE_CPR';
  if (cmp >= s1) return 'BELOW_BC';
  if (cmp >= s2) return 'BELOW_S1';
  if (cmp >= s3) return 'BELOW_S2';
  return 'BELOW_S3';
}

/**
 * Calculate dynamic target based on CMP position
 */
export function calculateDynamicTarget(cmp: number, cpr: CPRValues): DynamicTarget {
  const zone = determinePivotZone(cmp, cpr);
  const { bc, tc, r1, r2, r3, s1, s2, s3 } = cpr;
  
  switch (zone) {
    case 'ABOVE_R3':
      return {
        zone,
        targetLevel: 'R3',
        targetValue: r3,
        reasoning: 'CMP above R3, target is current resistance level',
        cmp
      };
      
    case 'ABOVE_R2':
      return {
        zone,
        targetLevel: 'R3',
        targetValue: r3,
        reasoning: 'CMP above R2, targeting next resistance R3',
        cmp
      };
      
    case 'ABOVE_R1':
      return {
        zone,
        targetLevel: 'R2',
        targetValue: r2,
        reasoning: 'CMP above R1, targeting next resistance R2',
        cmp
      };
      
    case 'ABOVE_TC':
      return {
        zone,
        targetLevel: 'R1',
        targetValue: r1,
        reasoning: 'CMP above TC, targeting next resistance R1',
        cmp
      };
      
    case 'INSIDE_CPR':
      return {
        zone,
        targetLevel: 'RANGE',
        targetValue: 0,
        reasoning: 'CMP inside CPR (BC-TC), market is range-bound',
        cmp
      };
      
    case 'BELOW_BC':
      return {
        zone,
        targetLevel: 'S1',
        targetValue: s1,
        reasoning: 'CMP below BC, targeting next support S1',
        cmp
      };
      
    case 'BELOW_S1':
      return {
        zone,
        targetLevel: 'S2',
        targetValue: s2,
        reasoning: 'CMP below S1, targeting next support S2',
        cmp
      };
      
    case 'BELOW_S2':
      return {
        zone,
        targetLevel: 'S3',
        targetValue: s3,
        reasoning: 'CMP below S2, targeting next support S3',
        cmp
      };
      
    case 'BELOW_S3':
      return {
        zone,
        targetLevel: 'S3',
        targetValue: s3,
        reasoning: 'CMP below S3, target is current support level',
        cmp
      };
      
    default:
      return {
        zone: 'INSIDE_CPR',
        targetLevel: 'RANGE',
        targetValue: 0,
        reasoning: 'CMP position unclear, market is range-bound',
        cmp
      };
  }
}

/**
 * Get zone display label
 */
export function getZoneLabel(zone: PivotZone): string {
  switch (zone) {
    case 'ABOVE_R3': return 'Above R3';
    case 'ABOVE_R2': return 'Above R2';
    case 'ABOVE_R1': return 'Above R1';
    case 'ABOVE_TC': return 'Above TC';
    case 'INSIDE_CPR': return 'Inside CPR';
    case 'BELOW_BC': return 'Below BC';
    case 'BELOW_S1': return 'Below S1';
    case 'BELOW_S2': return 'Below S2';
    case 'BELOW_S3': return 'Below S3';
    default: return 'Unknown';
  }
}

/**
 * Get zone color based on bullish/bearish nature
 */
export function getZoneColor(zone: PivotZone): string {
  switch (zone) {
    case 'ABOVE_R3':
    case 'ABOVE_R2':
    case 'ABOVE_R1':
    case 'ABOVE_TC':
      return 'text-bullish';
    case 'BELOW_BC':
    case 'BELOW_S1':
    case 'BELOW_S2':
    case 'BELOW_S3':
      return 'text-bearish';
    case 'INSIDE_CPR':
      return 'text-neutral';
    default:
      return 'text-muted-foreground';
  }
}
