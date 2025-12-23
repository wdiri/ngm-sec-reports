/**
 * Insights Engine
 * 
 * Analyzes historical monthly metrics to generate actionable insights including:
 * - Trends (month-over-month, rolling averages, top improving/degrading)
 * - Anomalies (statistical outliers using z-score and IQR) - Only flags BAD anomalies
 * - Milestones (new highs/lows, streaks, threshold crossings)
 * - Comparisons (MoM, YoY, vs averages)
 * - Forecasts (moving average, linear regression)
 * - Correlations (Pearson correlation between metrics)
 * 
 * Note: Anomaly detection considers whether "lower is better" for each metric.
 * For "lower is better" metrics (e.g., phishing click rate), only high values are flagged.
 * For "higher is better" metrics, only low values are flagged.
 * 
 * To add a new insight type:
 * 1. Add the type to InsightType in types/index.ts
 * 2. Create a generator function (e.g., generateNewInsightType)
 * 3. Add it to the generateInsights function's type filter
 * 4. Update the documentation
 */

import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { Insight, InsightType } from '@/types';
import { getMetricName } from '@/lib/domain/metrics';

export interface MetricTimeSeries {
  month: string; // YYYY-MM format
  value: number;
  periodId: string;
}

export interface InsightsOptions {
  timeRange?: number; // months
  metricNumbers?: number[];
  types?: InsightType[];
}

/**
 * Prepare time series data for a specific metric from periods
 * Handles missing months, null values, and sorts by date
 */
export function prepareMetricTimeSeries(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  metricNumber: number
): MetricTimeSeries[] {
  const series: MetricTimeSeries[] = [];

  // Sort periods by start date (oldest first)
  const sortedPeriods = [...periods].sort((a, b) => {
    const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
    const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
    return aDate.getTime() - bDate.getTime();
  });

  for (const period of sortedPeriods) {
    const metric = period.metrics.find(m => m.metricNumber === metricNumber);
    if (metric && !metric.isNA && metric.value !== null && metric.value !== undefined) {
      const startDate = period.startDate instanceof Date ? period.startDate : new Date(period.startDate);
      const month = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      series.push({
        month,
        value: metric.value,
        periodId: period.id,
      });
    }
  }

  return series;
}

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate z-score
 */
function zScore(value: number, values: number[]): number {
  const avg = mean(values);
  const sd = stdDev(values);
  if (sd === 0) return 0;
  return (value - avg) / sd;
}

/**
 * Calculate quartiles (Q1, Q2, Q3)
 */
function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  
  const q2 = len % 2 === 0
    ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
    : sorted[Math.floor(len / 2)];

  const lowerHalf = sorted.slice(0, Math.floor(len / 2));
  const upperHalf = sorted.slice(Math.ceil(len / 2));

  const q1 = lowerHalf.length % 2 === 0
    ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
    : lowerHalf[Math.floor(lowerHalf.length / 2)];

  const q3 = upperHalf.length % 2 === 0
    ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
    : upperHalf[Math.floor(upperHalf.length / 2)];

  return { q1, q2, q3 };
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Generate a unique ID for an insight
 */
function generateInsightId(type: InsightType, metricNumber: number, suffix?: string): string {
  return `${type}-m${metricNumber}${suffix ? `-${suffix}` : ''}-${Date.now()}`;
}

/**
 * Generate trend insights
 */
function generateTrendInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    if (series.length < 2) continue;

    const metricName = getMetricName(metricNumber);

    // Month-over-month changes
    const recent = series[series.length - 1];
    const previous = series[series.length - 2];
    const momChange = ((recent.value - previous.value) / previous.value) * 100;

    if (Math.abs(momChange) > 5) {
      insights.push({
        id: generateInsightId('trend', metricNumber, 'mom'),
        type: 'trend',
        title: `${metricName}: ${momChange > 0 ? 'Improvement' : 'Decline'} This Month`,
        summary: `${momChange > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(momChange).toFixed(1)}% compared to last month (${previous.value.toFixed(1)} → ${recent.value.toFixed(1)})`,
        severity: Math.abs(momChange) > 20 ? 'warning' : 'info',
        metricKeys: [metricNumber],
        period: { start: previous.month, end: recent.month },
        evidence: {
          values: [previous, recent].map(v => ({ month: v.month, value: v.value })),
          changePct: momChange,
        },
      });
    }

    // Rolling averages
    if (series.length >= 3) {
      const last3 = series.slice(-3);
      const last6 = series.length >= 6 ? series.slice(-6) : null;
      const last12 = series.length >= 12 ? series.slice(-12) : null;

      const avg3 = mean(last3.map(v => v.value));
      const current = recent.value;
      const diff3 = ((current - avg3) / avg3) * 100;

      if (Math.abs(diff3) > 10) {
        insights.push({
          id: generateInsightId('trend', metricNumber, 'avg3'),
          type: 'trend',
          title: `${metricName}: ${diff3 > 0 ? 'Above' : 'Below'} 3-Month Average`,
          summary: `Current value (${current.toFixed(1)}) is ${Math.abs(diff3).toFixed(1)}% ${diff3 > 0 ? 'above' : 'below'} the 3-month average (${avg3.toFixed(1)})`,
          severity: Math.abs(diff3) > 20 ? 'warning' : 'info',
          metricKeys: [metricNumber],
          evidence: {
            values: last3.map(v => ({ month: v.month, value: v.value })),
            changePct: diff3,
          },
        });
      }

      if (last6) {
        const avg6 = mean(last6.map(v => v.value));
        const diff6 = ((current - avg6) / avg6) * 100;
        if (Math.abs(diff6) > 15) {
          insights.push({
            id: generateInsightId('trend', metricNumber, 'avg6'),
            type: 'trend',
            title: `${metricName}: ${diff6 > 0 ? 'Above' : 'Below'} 6-Month Average`,
            summary: `Current value (${current.toFixed(1)}) is ${Math.abs(diff6).toFixed(1)}% ${diff6 > 0 ? 'above' : 'below'} the 6-month average (${avg6.toFixed(1)})`,
            severity: 'info',
            metricKeys: [metricNumber],
            evidence: {
              values: last6.map(v => ({ month: v.month, value: v.value })),
              changePct: diff6,
            },
          });
        }
      }
    }
  }

  // Top improving/degrading metrics (only if we have multiple metrics with data)
  if (periods.length >= 2 && metricNumbers.length > 1) {
    const metricChanges: Array<{ metricNumber: number; change: number; name: string }> = [];

    for (const metricNumber of metricNumbers) {
      const metricSeries = prepareMetricTimeSeries(periods, metricNumber);
      if (metricSeries.length < 2) continue;

      const recent = metricSeries[metricSeries.length - 1];
      const previous = metricSeries[metricSeries.length - 2];
      const change = ((recent.value - previous.value) / previous.value) * 100;
      metricChanges.push({
        metricNumber,
        change,
        name: getMetricName(metricNumber),
      });
    }

    if (metricChanges.length > 0) {
      metricChanges.sort((a, b) => b.change - a.change);

      // Top improving
      const topImproving = metricChanges.filter(m => m.change > 0).slice(0, 3);
      if (topImproving.length > 0) {
        insights.push({
          id: generateInsightId('trend', 0, 'top-improving'),
          type: 'trend',
          title: 'Top Improving Metrics This Month',
          summary: `The following metrics showed the largest improvements: ${topImproving.map(m => `${m.name} (+${m.change.toFixed(1)}%)`).join(', ')}`,
          severity: 'info',
          metricKeys: topImproving.map(m => m.metricNumber),
        });
      }

      // Top degrading
      const topDegrading = metricChanges.filter(m => m.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);
      if (topDegrading.length > 0) {
        insights.push({
          id: generateInsightId('trend', 0, 'top-degrading'),
          type: 'trend',
          title: 'Metrics Requiring Attention',
          summary: `The following metrics declined this month: ${topDegrading.map(m => `${m.name} (${m.change.toFixed(1)}%)`).join(', ')}`,
          severity: Math.abs(topDegrading[0].change) > 10 ? 'warning' : 'info',
          metricKeys: topDegrading.map(m => m.metricNumber),
        });
      }
    }
  }

  return insights;
}

/**
 * Generate anomaly insights using z-score and IQR methods
 * Only flags anomalies that are BAD (worse than expected), not good improvements
 */
function generateAnomalyInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions,
  tolerances: ToleranceBand[]
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    if (series.length < 3) continue;

    const metricName = getMetricName(metricNumber);
    const tolerance = tolerances.find(t => t.metricNumber === metricNumber);
    const isLowerBetter = tolerance?.isLowerBetter ?? false;
    const values = series.map(v => v.value);
    const recent = series[series.length - 1];

    // Z-score method (preferred for 6+ months)
    if (series.length >= 6) {
      const historicalValues = values.slice(0, -1); // All except most recent
      const z = zScore(recent.value, historicalValues);

      // Only flag if it's a BAD anomaly:
      // - For "lower is better": flag if value is ABOVE average (z > 2, bad)
      // - For "higher is better": flag if value is BELOW average (z < -2, bad)
      const isBadAnomaly = isLowerBetter 
        ? z > 2  // Lower is better, so above average is bad
        : z < -2; // Higher is better, so below average is bad

      if (isBadAnomaly && Math.abs(z) > 2) {
        const severity = Math.abs(z) > 3 ? 'critical' : 'warning';
        const direction = isLowerBetter 
          ? 'above' 
          : 'below';
        const context = isLowerBetter
          ? 'This is concerning as lower values are preferred for this metric.'
          : 'This is concerning as higher values are preferred for this metric.';
        
        insights.push({
          id: generateInsightId('anomaly', metricNumber, 'zscore'),
          type: 'anomaly',
          title: `${metricName}: Unusual ${isLowerBetter ? 'High' : 'Low'} Value Detected`,
          summary: `Current value (${recent.value.toFixed(1)}) is ${Math.abs(z).toFixed(2)} standard deviations ${direction} the historical average. ${context}`,
          severity,
          metricKeys: [metricNumber],
          period: { start: series[0].month, end: recent.month },
          evidence: {
            values: series.map(v => ({ month: v.month, value: v.value })),
            zScore: z,
            notes: [`Mean: ${mean(historicalValues).toFixed(1)}, StdDev: ${stdDev(historicalValues).toFixed(1)}`, isLowerBetter ? 'Lower values are better' : 'Higher values are better'],
          },
          recommendations: [
            'Review recent changes or events that may have caused this deviation',
            'Verify data accuracy for this period',
            'Monitor closely in the next reporting period',
            isLowerBetter ? 'Investigate why the value increased unexpectedly' : 'Investigate why the value decreased unexpectedly',
          ],
        });
      }
    }

    // IQR method (fallback or supplement)
    if (series.length >= 4) {
      const historicalValues = values.slice(0, -1);
      const { q1, q3 } = quartiles(historicalValues);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Only flag BAD outliers:
      // - For "lower is better": flag if value > upperBound (too high, bad)
      // - For "higher is better": flag if value < lowerBound (too low, bad)
      const isBadOutlier = isLowerBetter
        ? recent.value > upperBound
        : recent.value < lowerBound;

      if (isBadOutlier) {
        // Only add if we didn't already catch it with z-score
        const existing = insights.find(i => i.id === generateInsightId('anomaly', metricNumber, 'zscore'));
        if (!existing) {
          const context = isLowerBetter
            ? 'This is concerning as lower values are preferred for this metric.'
            : 'This is concerning as higher values are preferred for this metric.';
          
          insights.push({
            id: generateInsightId('anomaly', metricNumber, 'iqr'),
            type: 'anomaly',
            title: `${metricName}: Outlier Detected`,
            summary: `Current value (${recent.value.toFixed(1)}) falls outside the expected range [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}] based on interquartile range analysis. ${context}`,
            severity: 'warning',
            metricKeys: [metricNumber],
            period: { start: series[0].month, end: recent.month },
            evidence: {
              values: series.map(v => ({ month: v.month, value: v.value })),
              notes: [`Q1: ${q1.toFixed(1)}, Q3: ${q3.toFixed(1)}, IQR: ${iqr.toFixed(1)}`, isLowerBetter ? 'Lower values are better' : 'Higher values are better'],
            },
            recommendations: [
              'Review recent changes or events that may have caused this deviation',
              'Verify data accuracy for this period',
              isLowerBetter ? 'Investigate why the value increased unexpectedly' : 'Investigate why the value decreased unexpectedly',
            ],
          });
        }
      }
    }
  }

  return insights;
}

/**
 * Generate milestone insights
 */
function generateMilestoneInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions,
  tolerances: ToleranceBand[]
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    if (series.length < 2) continue;

    const metricName = getMetricName(metricNumber);
    const values = series.map(v => v.value);
    const recent = series[series.length - 1];

    // New highs/lows in last 12 months
    const last12 = series.length >= 12 ? series.slice(-12) : series;
    const last12Values = last12.map(v => v.value);
    const maxValue = Math.max(...last12Values);
    const minValue = Math.min(...last12Values);
    const maxIndex = last12Values.indexOf(maxValue);
    const minIndex = last12Values.indexOf(minValue);

    const tolerance = tolerances.find(t => t.metricNumber === metricNumber);
    const isLowerBetter = tolerance?.isLowerBetter ?? false;

    if (recent.value === maxValue && series.length >= 3) {
      // New high: good if "higher is better", bad if "lower is better"
      const isGood = !isLowerBetter;
      insights.push({
        id: generateInsightId('milestone', metricNumber, 'new-high'),
        type: 'milestone',
        title: `${metricName}: New High in Last 12 Months`,
        summary: `Reached a new high of ${maxValue.toFixed(1)} in ${recent.month}, the highest value in the last ${last12.length} months.${isGood ? ' This is a positive achievement!' : ' This requires attention as lower values are preferred.'}`,
        severity: isGood ? 'info' : 'warning',
        metricKeys: [metricNumber],
        period: { start: last12[0].month, end: recent.month },
        evidence: {
          values: last12.map(v => ({ month: v.month, value: v.value })),
        },
      });
    }

    if (recent.value === minValue && series.length >= 3) {
      // New low: good if "lower is better", bad if "higher is better"
      const isGood = isLowerBetter;
      insights.push({
        id: generateInsightId('milestone', metricNumber, 'new-low'),
        type: 'milestone',
        title: `${metricName}: New Low in Last 12 Months`,
        summary: `Reached a new low of ${minValue.toFixed(1)} in ${recent.month}, the lowest value in the last ${last12.length} months.${isGood ? ' This is a positive achievement!' : ' This requires attention as higher values are preferred.'}`,
        severity: isGood ? 'info' : 'warning',
        metricKeys: [metricNumber],
        period: { start: last12[0].month, end: recent.month },
        evidence: {
          values: last12.map(v => ({ month: v.month, value: v.value })),
        },
      });
    }

    // Longest improvement/decline streak
    if (series.length >= 3) {
      let currentStreak = 1;
      let longestStreak = 1;
      let streakDirection: 'up' | 'down' | null = null;
      let longestStreakDirection: 'up' | 'down' | null = null;

      for (let i = series.length - 1; i > 0; i--) {
        const current = series[i].value;
        const previous = series[i - 1].value;

        if (current > previous) {
          if (streakDirection === 'up') {
            currentStreak++;
          } else {
            currentStreak = 2;
            streakDirection = 'up';
          }
        } else if (current < previous) {
          if (streakDirection === 'down') {
            currentStreak++;
          } else {
            currentStreak = 2;
            streakDirection = 'down';
          }
        } else {
          currentStreak = 1;
          streakDirection = null;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          longestStreakDirection = streakDirection;
        }
      }

      if (longestStreak >= 4) {
        // For "lower is better" metrics: decline (down) is good, improvement (up) is bad
        // For "higher is better" metrics: improvement (up) is good, decline (down) is bad
        const isGoodStreak = isLowerBetter 
          ? longestStreakDirection === 'down'  // For lower-is-better: decline is good
          : longestStreakDirection === 'up';    // For higher-is-better: improvement is good
        
        const streakType = longestStreakDirection === 'up' ? 'Improvement' : 'Decline';
        const streakVerb = longestStreakDirection === 'up' ? 'Improved' : 'Declined';
        const trendDescription = isGoodStreak ? 'excellent' : 'concerning';
        
        insights.push({
          id: generateInsightId('milestone', metricNumber, 'streak'),
          type: 'milestone',
          title: `${metricName}: ${streakType} Streak`,
          summary: `${streakVerb} for ${longestStreak} consecutive months, indicating an ${trendDescription} trend.${isGoodStreak ? ' This is a positive achievement!' : ' This requires attention.'}`,
          severity: isGoodStreak ? 'info' : 'warning',
          metricKeys: [metricNumber],
          evidence: {
            values: series.slice(-longestStreak).map(v => ({ month: v.month, value: v.value })),
            notes: [`${longestStreak} consecutive months`],
          },
        });
      }
    }

    // First time crossing tolerance thresholds
    if (tolerance && series.length >= 2) {
      const recentValue = recent.value;
      const previousValue = series[series.length - 2].value;

      // Check if crossed into green zone
      if (tolerance.greenOperator === 'range' && tolerance.greenMin !== null && tolerance.greenMax !== null) {
        const wasInGreen = previousValue >= tolerance.greenMin && previousValue <= tolerance.greenMax;
        const isInGreen = recentValue >= tolerance.greenMin && recentValue <= tolerance.greenMax;
        if (!wasInGreen && isInGreen) {
          insights.push({
            id: generateInsightId('milestone', metricNumber, 'green-threshold'),
            type: 'milestone',
            title: `${metricName}: Entered Green Zone`,
            summary: `Crossed into the green tolerance zone (${tolerance.greenMin}-${tolerance.greenMax}) for the first time in recent history.`,
            severity: 'info',
            metricKeys: [metricNumber],
            period: { start: series[series.length - 2].month, end: recent.month },
            evidence: {
              values: [series[series.length - 2], recent].map(v => ({ month: v.month, value: v.value })),
            },
          });
        }
      }

      // Check if crossed into red zone
      if (tolerance.redOperator === 'range' && tolerance.redMin !== null && tolerance.redMax !== null) {
        const wasInRed = previousValue >= tolerance.redMin && previousValue <= tolerance.redMax;
        const isInRed = recentValue >= tolerance.redMin && recentValue <= tolerance.redMax;
        if (!wasInRed && isInRed) {
          insights.push({
            id: generateInsightId('milestone', metricNumber, 'red-threshold'),
            type: 'milestone',
            title: `${metricName}: Entered Red Zone`,
            summary: `Crossed into the red tolerance zone (${tolerance.redMin}-${tolerance.redMax}), requiring immediate attention.`,
            severity: 'critical',
            metricKeys: [metricNumber],
            period: { start: series[series.length - 2].month, end: recent.month },
            evidence: {
              values: [series[series.length - 2], recent].map(v => ({ month: v.month, value: v.value })),
            },
            recommendations: [
              'Investigate root cause of the decline',
              'Implement corrective actions immediately',
              'Increase monitoring frequency',
            ],
          });
        }
      }
    }
  }

  return insights;
}

/**
 * Generate comparison insights
 */
function generateComparisonInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Get most recent period
  const sortedPeriods = [...periods].sort((a, b) => {
    const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
    const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
    return bDate.getTime() - aDate.getTime();
  });

  if (sortedPeriods.length < 2) return insights;

  const currentPeriod = sortedPeriods[0];
  const lastPeriod = sortedPeriods[1];

  for (const metricNumber of metricNumbers) {
    const currentMetric = currentPeriod.metrics.find(m => m.metricNumber === metricNumber);
    const lastMetric = lastPeriod.metrics.find(m => m.metricNumber === metricNumber);

    if (!currentMetric || !lastMetric || currentMetric.isNA || lastMetric.isNA) continue;
    if (currentMetric.value === null || lastMetric.value === null) continue;

    const metricName = getMetricName(metricNumber);
    const change = ((currentMetric.value - lastMetric.value) / lastMetric.value) * 100;

    if (Math.abs(change) > 5) {
      insights.push({
        id: generateInsightId('comparison', metricNumber, 'mom'),
        type: 'comparison',
        title: `${metricName}: Month-over-Month Change`,
        summary: `${change > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month (${lastMetric.value.toFixed(1)} → ${currentMetric.value.toFixed(1)})`,
        severity: Math.abs(change) > 20 ? 'warning' : 'info',
        metricKeys: [metricNumber],
        period: {
          start: (lastPeriod.startDate instanceof Date ? lastPeriod.startDate : new Date(lastPeriod.startDate)).toISOString().slice(0, 7),
          end: (currentPeriod.startDate instanceof Date ? currentPeriod.startDate : new Date(currentPeriod.startDate)).toISOString().slice(0, 7),
        },
        evidence: {
          changePct: change,
        },
      });
    }

    // Year-over-year comparison
    const currentDate = currentPeriod.startDate instanceof Date ? currentPeriod.startDate : new Date(currentPeriod.startDate);
    const yearAgoPeriod = sortedPeriods.find(p => {
      const pDate = p.startDate instanceof Date ? p.startDate : new Date(p.startDate);
      const yearAgo = new Date(currentDate);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return pDate.getMonth() === yearAgo.getMonth() && pDate.getFullYear() === yearAgo.getFullYear();
    });

    if (yearAgoPeriod) {
      const yearAgoMetric = yearAgoPeriod.metrics.find(m => m.metricNumber === metricNumber);
      if (yearAgoMetric && !yearAgoMetric.isNA && yearAgoMetric.value !== null) {
        const yoyChange = ((currentMetric.value - yearAgoMetric.value) / yearAgoMetric.value) * 100;
        if (Math.abs(yoyChange) > 10) {
          insights.push({
            id: generateInsightId('comparison', metricNumber, 'yoy'),
            type: 'comparison',
            title: `${metricName}: Year-over-Year Change`,
            summary: `${yoyChange > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(yoyChange).toFixed(1)}% compared to the same month last year (${yearAgoMetric.value.toFixed(1)} → ${currentMetric.value.toFixed(1)})`,
            severity: Math.abs(yoyChange) > 25 ? 'warning' : 'info',
            metricKeys: [metricNumber],
            evidence: {
              changePct: yoyChange,
            },
          });
        }
      }
    }
  }

  return insights;
}

/**
 * Generate forecast insights
 */
function generateForecastInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    if (series.length < 3) continue;

    const metricName = getMetricName(metricNumber);
    const values = series.map(v => v.value);

    // Simple moving average forecast
    const last3 = values.slice(-3);
    const forecast = mean(last3);

    insights.push({
      id: generateInsightId('forecast', metricNumber, 'ma'),
      type: 'forecast',
      title: `${metricName}: Next Month Forecast`,
      summary: `Based on a 3-month moving average, the forecasted value for next month is ${forecast.toFixed(1)}. Note: This is a simple forecast with low confidence.`,
      severity: 'info',
      metricKeys: [metricNumber],
      evidence: {
        values: series.slice(-3).map(v => ({ month: v.month, value: v.value })),
        notes: ['Low confidence forecast based on moving average', `Current trend: ${values[values.length - 1] > values[values.length - 2] ? 'increasing' : 'decreasing'}`],
      },
    });

    // Linear regression forecast (if 6+ months)
    if (series.length >= 6) {
      const n = series.length;
      const x = series.map((_, i) => i);
      const y = values;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const nextX = n;
      const linearForecast = slope * nextX + intercept;

      if (Math.abs(linearForecast - forecast) > 5) {
        insights.push({
          id: generateInsightId('forecast', metricNumber, 'linear'),
          type: 'forecast',
          title: `${metricName}: Linear Trend Forecast`,
          summary: `Based on linear regression, the forecasted value is ${linearForecast.toFixed(1)} (trend: ${slope > 0 ? 'increasing' : 'decreasing'} at ${Math.abs(slope).toFixed(2)} per month). Low confidence.`,
          severity: 'info',
          metricKeys: [metricNumber],
          evidence: {
            values: series.map(v => ({ month: v.month, value: v.value })),
            notes: [`Slope: ${slope.toFixed(2)}, Intercept: ${intercept.toFixed(1)}`, 'Low confidence forecast'],
          },
        });
      }
    }
  }

  return insights;
}

/**
 * Generate correlation insights
 */
function generateCorrelationInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions
): Insight[] {
  const insights: Insight[] = [];
  const metricNumbers = options.metricNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  if (metricNumbers.length < 2) return insights;

  // Get time series for all metrics
  const allSeries: Record<number, MetricTimeSeries[]> = {};
  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    if (series.length >= 12) {
      allSeries[metricNumber] = series;
    }
  }

  // Find common months across all series
  const metricKeys = Object.keys(allSeries).map(Number);
  if (metricKeys.length < 2) return insights;

  // Align series by month
  const alignedData: Record<string, Record<number, number>> = {};
  for (const metricNumber of metricKeys) {
    for (const point of allSeries[metricNumber]) {
      if (!alignedData[point.month]) {
        alignedData[point.month] = {};
      }
      alignedData[point.month][metricNumber] = point.value;
    }
  }

  // Find months where all metrics have values
  const commonMonths = Object.keys(alignedData).filter(month => {
    return metricKeys.every(mn => alignedData[month][mn] !== undefined);
  });

  if (commonMonths.length < 12) return insights;

  // Calculate correlations between all pairs
  for (let i = 0; i < metricKeys.length; i++) {
    for (let j = i + 1; j < metricKeys.length; j++) {
      const m1 = metricKeys[i];
      const m2 = metricKeys[j];

      const values1 = commonMonths.map(month => alignedData[month][m1]);
      const values2 = commonMonths.map(month => alignedData[month][m2]);

      const correlation = pearsonCorrelation(values1, values2);

      if (Math.abs(correlation) > 0.7) {
        const name1 = getMetricName(m1);
        const name2 = getMetricName(m2);
        const direction = correlation > 0 ? 'positive' : 'negative';

        insights.push({
          id: generateInsightId('correlation', m1, `with-${m2}`),
          type: 'correlation',
          title: `Strong ${direction} correlation: ${name1} and ${name2}`,
          summary: `These metrics show a strong ${direction} correlation (r=${correlation.toFixed(2)}) over the last ${commonMonths.length} months. Note: Correlation does not imply causation.`,
          severity: 'info',
          metricKeys: [m1, m2],
          evidence: {
            values: commonMonths.slice(-6).map(month => ({
              month,
              value: alignedData[month][m1], // Use first metric for display
            })),
            notes: [`Correlation coefficient: ${correlation.toFixed(3)}`, 'Based on last 12+ months of data', 'Correlation ≠ causation'],
          },
        });
      }
    }
  }

  return insights;
}

/**
 * Main function to generate all insights
 */
export function generateInsights(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  tolerances: ToleranceBand[],
  options: InsightsOptions = {}
): Insight[] {
  // Filter periods by time range if specified
  let filteredPeriods = periods;
  if (options.timeRange && options.timeRange > 0) {
    // Get the most recent period's date as reference point
    const sortedByDate = [...periods].sort((a, b) => {
      const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return bDate.getTime() - aDate.getTime();
    });
    
    if (sortedByDate.length > 0) {
      const mostRecentDate = sortedByDate[0].startDate instanceof Date 
        ? sortedByDate[0].startDate 
        : new Date(sortedByDate[0].startDate);
      
      // Calculate cutoff date: mostRecentDate - timeRange months
      const cutoffDate = new Date(mostRecentDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - options.timeRange);
      // Set to first day of that month to include the entire month
      cutoffDate.setDate(1);
      
      filteredPeriods = periods.filter(p => {
        const pDate = p.startDate instanceof Date ? p.startDate : new Date(p.startDate);
        // Include periods from cutoff month onwards
        return pDate >= cutoffDate;
      });
    }
  }

  // Only use finalised periods
  filteredPeriods = filteredPeriods.filter(p => p.isFinalised);

  if (filteredPeriods.length < 1) {
    return [{
      id: 'no-data',
      type: 'trend',
      title: 'Insufficient Data',
      summary: 'Not enough historical data available to generate insights. At least 1 finalised period is required.',
      severity: 'info',
    }];
  }

  const allInsights: Insight[] = [];
  const requestedTypes = options.types || ['trend', 'anomaly', 'milestone', 'comparison', 'forecast', 'correlation'];

  if (requestedTypes.includes('trend')) {
    allInsights.push(...generateTrendInsights(filteredPeriods, options));
  }
  if (requestedTypes.includes('anomaly')) {
    allInsights.push(...generateAnomalyInsights(filteredPeriods, options, tolerances));
  }
  if (requestedTypes.includes('milestone')) {
    allInsights.push(...generateMilestoneInsights(filteredPeriods, options, tolerances));
  }
  if (requestedTypes.includes('comparison')) {
    allInsights.push(...generateComparisonInsights(filteredPeriods, options));
  }
  if (requestedTypes.includes('forecast')) {
    allInsights.push(...generateForecastInsights(filteredPeriods, options));
  }
  if (requestedTypes.includes('correlation')) {
    allInsights.push(...generateCorrelationInsights(filteredPeriods, options));
  }

  return allInsights;
}

