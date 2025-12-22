import { ToleranceBand } from '@prisma/client';
import { RAGStatus } from '@/types';

export function calculateRAG(value: number | null | undefined, toleranceBand: ToleranceBand | null | undefined): RAGStatus {
  if (value === null || value === undefined || !toleranceBand) {
    return 'na';
  }

  // Check green band
  if (checkBand(value, toleranceBand.greenMin, toleranceBand.greenMax, toleranceBand.greenOperator)) {
    return 'green';
  }

  // Check amber band
  if (checkBand(value, toleranceBand.amberMin, toleranceBand.amberMax, toleranceBand.amberOperator)) {
    return 'amber';
  }

  // Check red band
  if (checkBand(value, toleranceBand.redMin, toleranceBand.redMax, toleranceBand.redOperator)) {
    return 'red';
  }

  // Default to red if no band matches
  return 'red';
}

function checkBand(value: number, min: number | null, max: number | null, operator: string): boolean {
  if (min === null && max === null) {
    return false;
  }

  switch (operator) {
    case '>=':
      return min !== null && value >= min;
    case '<=':
      return max !== null && value <= max;
    case '==':
      return min !== null && value === min;
    case 'range':
      const minCheck = min === null || value >= min;
      const maxCheck = max === null || value <= max;
      return minCheck && maxCheck;
    default:
      return false;
  }
}

