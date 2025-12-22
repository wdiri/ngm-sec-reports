'use client';

import { Metric, ReportingPeriod, ToleranceBand } from '@prisma/client';
import { useCallback, useRef, useState } from 'react';
import { MetricFormField } from './MetricFormField';

interface MetricsEntryFormProps {
  period: ReportingPeriod;
  metrics: Metric[];
  tolerances: ToleranceBand[];
  onUpdate: (metricId: string, updates: Partial<Metric>) => Promise<void>;
  onSave: () => Promise<void>;
  onFinalise: () => Promise<void>;
}

export function MetricsEntryForm({
  period,
  metrics,
  tolerances,
  onUpdate,
  onSave,
  onFinalise,
}: MetricsEntryFormProps) {
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [isFinalising, setIsFinalising] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSave();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 2000);
  }, [onSave]);

  const handleMetricChange = useCallback(
    async (metricId: string, updates: Partial<Metric>) => {
      const metric = metrics.find((m) => m.id === metricId);
      if (!metric) return;

      const newErrors: Record<string, string> = {};

      if (!updates.isNA && updates.value !== undefined && updates.value !== null) {
        if (metric.unit === '%' && (updates.value < 0 || updates.value > 100)) {
          newErrors.value = 'Value must be between 0 and 100';
        } else if (updates.value < 0) {
          newErrors.value = 'Value must be greater than or equal to 0';
        }
      }

      setErrors((prev) => ({ ...prev, [metricId]: newErrors }));

      if (Object.keys(newErrors).length === 0) {
        await onUpdate(metricId, updates);
        debouncedSave();
      }
    },
    [metrics, onUpdate, debouncedSave],
  );

  const handleFinalise = async () => {
    if (!confirm('Mark this period as final? You can still make edits later if needed.')) {
      return;
    }

    setIsFinalising(true);
    try {
      await onSave();
      await onFinalise();
    } catch (err) {
      console.error('Failed to finalise:', err);
      alert('Failed to finalise period. Please try again.');
    } finally {
      setIsFinalising(false);
    }
  };

  const getToleranceForMetric = (metricNumber: number): ToleranceBand | null => {
    return tolerances.find((t) => t.metricNumber === metricNumber) ?? null;
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Editing</p>
          <h2 className="text-xl font-semibold text-gray-900">Period {period.label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            Auto-saves after you type
          </span>
          {period.isFinalised ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Finalised
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {metrics
          .slice()
          .sort((a, b) => a.metricNumber - b.metricNumber)
          .map((metric) => (
            <MetricFormField
              key={metric.id}
              metric={metric}
              tolerance={getToleranceForMetric(metric.metricNumber)}
              onChange={(updates) => handleMetricChange(metric.id, updates)}
              errors={errors[metric.id]}
            />
          ))}
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={handleFinalise}
          disabled={isFinalising}
          className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
        >
          {isFinalising ? 'Finalising...' : 'Finalise period'}
        </button>
      </div>
    </div>
  );
}
