'use client';

import { Metric, ToleranceBand, ReportingPeriod } from '@prisma/client';
import { Trend } from '@/types';
import { calculateRAG } from '@/lib/rag';
import { ToleranceDisplay } from './ToleranceDisplay';
import { TrendIndicator } from './TrendIndicator';

interface DashboardTableProps {
  period: ReportingPeriod;
  metrics: (Metric & { tolerance?: ToleranceBand | null; trend?: Trend | null })[];
  showSparkline?: boolean;
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === 'count') {
    return value.toString();
  }
  if (unit === 'hours') {
    return `${value}h`;
  }
  // For % and any other units, keep them directly after the number
  return `${value}${unit}`;
}

export function DashboardTable({ period, metrics, showSparkline = false }: DashboardTableProps) {
  const sortedMetrics = [...metrics].sort((a, b) => a.metricNumber - b.metricNumber);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-ngm-border bg-white shadow-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Security metrics dashboard for {period.label} - showing metric values, tolerance bands, trends, and insights
        </caption>
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border-b border-ngm-border px-4 py-3 text-left text-sm font-semibold" style={{ width: '40%' }}>
              Metric
            </th>
            <th className="border-b border-ngm-border px-4 py-3 text-center text-sm font-semibold" style={{ width: '12%' }}>
              Tolerance
            </th>
            <th className="border-b border-ngm-border px-4 py-3 text-center text-sm font-semibold" style={{ width: '10%' }}>
              Result
            </th>
            <th className="border-b border-ngm-border px-4 py-3 text-center text-sm font-semibold" style={{ width: '10%' }}>
              Trend
            </th>
            <th className="border-b border-ngm-border px-4 py-3 text-left text-sm font-semibold" style={{ width: '28%' }}>
              Insight
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMetrics.map((metric, index) => {
            const ragStatus = calculateRAG(metric.value, metric.tolerance ?? null);
            const ragColors = {
              green: 'text-green-600',
              amber: 'text-amber-600',
              red: 'text-red-600',
              na: 'text-gray-400',
            };

            return (
              <tr
                key={metric.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
              >
                <td className="border-t border-ngm-border px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">
                    <span className="text-xs uppercase tracking-wide text-gray-500">M{metric.metricNumber}</span>
                    {' - '}
                    {metric.name}
                  </div>
                  <div className="text-sm text-gray-600">{metric.description}</div>
                </td>
                <td className="border-t border-ngm-border px-4 py-3 align-top">
                  <ToleranceDisplay toleranceBand={metric.tolerance ?? null} />
                </td>
                <td className="border-t border-ngm-border px-4 py-3 text-center align-top">
                  {metric.isNA ? (
                    <span className="text-gray-400">N/A</span>
                  ) : (
                    <span className={`font-semibold ${ragColors[ragStatus]}`}>
                      {metric.value !== null ? formatMetricValue(metric.value, metric.unit) : '-'}
                    </span>
                  )}
                </td>
                <td className="border-t border-ngm-border px-4 py-3 text-center align-top">
                  <TrendIndicator
                    trend={metric.trend ?? null}
                    showSparkline={showSparkline}
                    toleranceBand={metric.tolerance ?? null}
                  />
                </td>
                <td className="border-t border-ngm-border px-4 py-3 text-sm align-top">
                  {metric.insight ? (
                    <div className="text-gray-800">{metric.insight}</div>
                  ) : (
                    <span className="text-gray-400">Add commentary to explain the status.</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

