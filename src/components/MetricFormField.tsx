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
    na: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const handleValueChange = (value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onChange({ value: numValue });
  };

  const handleNAChange = (isNA: boolean) => {
    onChange({ isNA, value: isNA ? null : metric.value });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Metric {metric.metricNumber}</div>
          <h3 className="font-semibold text-gray-900">{metric.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${ragColors[ragStatus]}`}>
            Status: {ragStatus.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => onChange({ hidden: !metric.hidden })}
            disabled={disabled}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              metric.hidden
                ? 'bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            } disabled:opacity-60`}
          >
            {metric.hidden ? 'Hidden from report' : 'Hide in report'}
          </button>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
        />
        {errors?.value && <p className="text-red-600 text-sm mt-1">{errors.value}</p>}
        <p className="mt-1 text-xs text-gray-500">Use decimals for percentages to show precision.</p>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={metric.isNA}
            onChange={(e) => handleNAChange(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-gray-700">Not Applicable</span>
        </label>
        {metric.isNA && (
          <textarea
            value={metric.naReason ?? ''}
            onChange={(e) => onChange({ naReason: e.target.value })}
            disabled={disabled}
            placeholder="Reason for N/A..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 mt-1"
          />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700">
          Tolerance window
          <div className="mt-1">
            <ToleranceDisplay toleranceBand={tolerance} />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Status updates as soon as you change the value.
        </div>
      </div>
    </div>
  );
}

