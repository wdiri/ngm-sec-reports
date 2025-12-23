'use client';

import { Metric, ToleranceBand } from '@prisma/client';
import { calculateRAG } from '@/lib/rag';
import { ToleranceDisplay } from './ToleranceDisplay';

interface MetricFormFieldProps {
  metric: Metric;
  tolerance: ToleranceBand | null;
  onChange: (updates: Partial<Metric>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function MetricFormField({ metric, tolerance, onChange, errors, disabled }: MetricFormFieldProps) {
  const ragStatus = calculateRAG(metric.value, tolerance);
  const ragColors = {
    green: 'bg-green-50 text-green-800 border-green-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    na: 'bg-gray-50 text-gray-700 border-ngm-border',
  };

  const handleValueChange = (value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onChange({ value: numValue });
  };

  const handleNAChange = (isNA: boolean) => {
    onChange({ isNA, value: isNA ? null : metric.value });
  };

  return (
    <div className="border border-ngm-border rounded-xl p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            <span className="text-xs uppercase tracking-wide text-gray-500">M{metric.metricNumber}</span>
            {' - '}
            {metric.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${ragColors[ragStatus]}`}>
            Status: {ragStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value {!metric.isNA && <span className="text-gray-500">({metric.unit})</span>}
        </label>
        <input
          type="number"
          value={metric.value ?? ''}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled || metric.isNA}
          min={0}
          max={metric.unit === '%' ? 100 : undefined}
          step={metric.unit === '%' ? 0.1 : 1}
          aria-label={`Value for ${metric.name} in ${metric.unit}`}
          aria-describedby={`metric-${metric.metricNumber}-description`}
          className="w-full px-3 py-2 border border-ngm-border rounded-md focus:outline-none focus:ring-2 focus:ring-ngm-accent disabled:bg-gray-100"
        />
        {errors?.value && <p className="text-red-600 text-sm mt-1">{errors.value}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Insight / Comment
        </label>
        <textarea
          value={metric.insight ?? ''}
          onChange={(e) => onChange({ insight: e.target.value })}
          disabled={disabled}
          placeholder="What, so what, now what..."
          rows={3}
          className="w-full px-3 py-2 border border-ngm-border rounded-md focus:outline-none focus:ring-2 focus:ring-ngm-accent disabled:bg-gray-100"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={metric.isNA}
              onChange={(e) => handleNAChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
              title="Mark as Not Applicable if this metric doesn't apply to this period. This will clear the value and require a reason."
            />
            <span className="text-sm font-medium text-gray-700">
              Not Applicable
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={metric.hidden || false}
              onChange={(e) => onChange({ hidden: e.target.checked })}
              disabled={disabled}
              className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
              title={metric.hidden ? 'Show this metric in reports. Hidden metrics are excluded from dashboard views but still have values.' : 'Hide this metric from reports. Hidden metrics are excluded from dashboard views but still have values.'}
            />
            <span className="text-sm font-medium text-gray-700">
              Hide in report
            </span>
          </label>
        </div>
        {metric.isNA && (
          <textarea
            value={metric.naReason ?? ''}
            onChange={(e) => onChange({ naReason: e.target.value })}
            disabled={disabled}
            placeholder="Reason for N/A..."
            rows={2}
            className="w-full px-3 py-2 border border-ngm-border rounded-md focus:outline-none focus:ring-2 focus:ring-ngm-accent disabled:bg-gray-100"
          />
        )}
      </div>

      <div className="text-sm text-gray-700">
        Tolerance window
        <div className="mt-1">
          <ToleranceDisplay toleranceBand={tolerance} />
        </div>
      </div>
    </div>
  );
}

