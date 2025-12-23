'use client';

import { InsightType } from '@/types';
import { getMetricNamesMap } from '@/lib/domain/metrics';

interface InsightsFiltersProps {
  timeRange: number | null;
  selectedMetrics: number[];
  selectedTypes: InsightType[];
  onTimeRangeChange: (range: number | null) => void;
  onMetricsChange: (metrics: number[]) => void;
  onTypesChange: (types: InsightType[]) => void;
}

const TIME_RANGE_OPTIONS = [
  { value: -1, label: 'Select time range' },
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
  { value: 24, label: 'Last 24 months' },
  { value: 0, label: 'All time' },
];

const INSIGHT_TYPES: Array<{ value: InsightType; label: string }> = [
  { value: 'trend', label: 'Trends' },
  { value: 'anomaly', label: 'Anomalies' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'comparison', label: 'Comparisons' },
  { value: 'forecast', label: 'Forecasts' },
  { value: 'correlation', label: 'Correlations' },
].sort((a, b) => a.label.localeCompare(b.label)) as Array<{ value: InsightType; label: string }>;

export function InsightsFilters({
  timeRange,
  selectedMetrics,
  selectedTypes,
  onTimeRangeChange,
  onMetricsChange,
  onTypesChange,
}: InsightsFiltersProps) {
  const metricNames = getMetricNamesMap();
  const allMetrics = Array.from({ length: 11 }, (_, i) => i + 1);

  const handleMetricToggle = (metricNumber: number) => {
    if (selectedMetrics.includes(metricNumber)) {
      onMetricsChange(selectedMetrics.filter(m => m !== metricNumber));
    } else {
      onMetricsChange([...selectedMetrics, metricNumber]);
    }
  };

  const handleTypeToggle = (type: InsightType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-ngm-border p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
      
      <div className="space-y-4 flex-grow flex flex-col">
        {/* Time Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Time Range</label>
          <select
            value={timeRange === null ? -1 : timeRange}
            onChange={(e) => {
              const value = Number(e.target.value);
              onTimeRangeChange(value === -1 ? null : value);
            }}
            className="w-full px-3 py-2 border border-ngm-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ngm-accent"
          >
            {TIME_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Insight Types */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Insight Types</label>
          <div className="space-y-2">
            {INSIGHT_TYPES.map(type => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.value)}
                  onChange={() => handleTypeToggle(type.value)}
                  className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
                />
                <span className="ml-2 text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-grow flex flex-col min-h-0">
          <label className="block text-xs font-medium text-gray-700 mb-2">Metrics</label>
          <div className="flex-grow overflow-y-auto space-y-2 min-h-0">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMetrics.length === allMetrics.length && selectedMetrics.length > 0}
                onChange={() => {
                  if (selectedMetrics.length === allMetrics.length) {
                    onMetricsChange([]);
                  } else {
                    onMetricsChange(allMetrics);
                  }
                }}
                className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
              />
              <span className="ml-2 text-sm text-gray-700 font-medium">All Metrics</span>
            </label>
            {allMetrics.map(metricNumber => (
              <label key={metricNumber} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metricNumber)}
                  onChange={() => handleMetricToggle(metricNumber)}
                  className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
                />
                <span className="ml-2 text-sm text-gray-700">
                  M{metricNumber}: {metricNames[metricNumber] || 'Unknown'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

