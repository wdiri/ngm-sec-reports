'use client';

import { Trend } from '@/types';
import { Sparkline } from './Sparkline';

interface TrendIndicatorProps {
  trend: Trend | null;
  showSparkline?: boolean;
  toleranceBand?: { isLowerBetter: boolean } | null;
}

export function TrendIndicator({ trend, showSparkline = false, toleranceBand }: TrendIndicatorProps) {
  if (!trend || trend.values.length < 2) {
    return <span className="text-gray-400">-</span>;
  }

  if (showSparkline) {
    return (
      <div className="w-full">
        <Sparkline values={trend.values} isLowerBetter={toleranceBand?.isLowerBetter ?? false} />
      </div>
    );
  }

  const arrowMap = {
    up: '▲',
    down: '▼',
    flat: '→',
  } as const;

  const colorMap = {
    up: 'text-green-600',
    down: 'text-red-600',
    flat: 'text-gray-600',
  } as const;

  return (
    <span className={`text-lg font-semibold ${colorMap[trend.direction]}`}>
      {arrowMap[trend.direction]}
    </span>
  );
}
