import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { Trend, TrendDirection } from '@/types';
import { CONFIG } from './domain/metrics';

export function calculateTrend(
  metricNumber: number,
  currentPeriod: ReportingPeriod & { metrics: Metric[] },
  historicalPeriods: (ReportingPeriod & { metrics: Metric[] })[],
  toleranceBand: ToleranceBand | null
): Trend {
  // Get last N finalised periods (excluding current)
  const sortedPeriods = historicalPeriods
    .filter(p => p.isFinalised && p.id !== currentPeriod.id)
    .sort((a, b) => {
      const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, CONFIG.TREND_HISTORY_PERIODS);

  // Extract values for this metric
  const values: number[] = [];
  
  for (const period of sortedPeriods) {
    const metric = period.metrics.find(m => m.metricNumber === metricNumber);
    if (metric && !metric.isNA && metric.value !== null) {
      values.push(metric.value);
    }
  }

  // Add current value if available
  const currentMetric = currentPeriod.metrics.find(m => m.metricNumber === metricNumber);
  if (currentMetric && !currentMetric.isNA && currentMetric.value !== null) {
    values.push(currentMetric.value);
  }

  // Need at least 2 values to determine trend
  if (values.length < 2) {
    return { direction: 'flat', values };
  }

  // Calculate direction
  const recent = values[values.length - 1];
  const previous = values[values.length - 2];
  const change = Math.abs(recent - previous);
  const flatTolerance = toleranceBand?.flatTolerance ?? 1.0;

  // Check if change is within flat tolerance
  if (change < flatTolerance) {
    return { direction: 'flat', values };
  }

  // Determine if trend is up or down based on isLowerBetter
  const isLowerBetter = toleranceBand?.isLowerBetter ?? false;
  const isIncreasing = recent > previous;

  let direction: TrendDirection;
  if (isLowerBetter) {
    // For "lower is better": decreasing = up (good), increasing = down (bad)
    direction = isIncreasing ? 'down' : 'up';
  } else {
    // For "higher is better": increasing = up (good), decreasing = down (bad)
    direction = isIncreasing ? 'up' : 'down';
  }

  return { direction, values };
}

