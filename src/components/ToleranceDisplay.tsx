import { ToleranceBand } from '@prisma/client';

interface ToleranceDisplayProps {
  toleranceBand: ToleranceBand | null;
}

export function ToleranceDisplay({ toleranceBand }: ToleranceDisplayProps) {
  if (!toleranceBand) {
    return <span className="text-gray-400">No tolerance set</span>;
  }

  const formatThreshold = (min: number | null, max: number | null, operator: string) => {
    switch (operator) {
      case '>=':
        return min !== null ? `>=${min}` : '';
      case '<=':
        return max !== null ? `<=${max}` : '';
      case '==':
        return min !== null ? `=${min}` : '';
      case 'range':
        if (min !== null && max !== null) {
          return `${min}-${max}`;
        }
        if (min !== null) {
          return `>=${min}`;
        }
        if (max !== null) {
          return `<=${max}`;
        }
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-green-500"></div>
        <span className="text-gray-700">
          {formatThreshold(toleranceBand.greenMin, toleranceBand.greenMax, toleranceBand.greenOperator)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-amber-500"></div>
        <span className="text-gray-700">
          {formatThreshold(toleranceBand.amberMin, toleranceBand.amberMax, toleranceBand.amberOperator)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        <span className="text-gray-700">
          {formatThreshold(toleranceBand.redMin, toleranceBand.redMax, toleranceBand.redOperator)}
        </span>
      </div>
    </div>
  );
}
