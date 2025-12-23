'use client';

import { Metric, ReportingPeriod, ToleranceBand } from '@prisma/client';
import { useCallback, useRef, useState } from 'react';
import { MetricFormField } from './MetricFormField';
import { CONFIG } from '@/lib/domain/metrics';
import toast from 'react-hot-toast';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSave();
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, CONFIG.AUTO_SAVE_DEBOUNCE_MS);
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
        setHasUnsavedChanges(true);
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
      toast.success('Period finalised successfully');
    } catch (err) {
      console.error('Failed to finalise:', err);
      toast.error('Failed to finalise period. Please try again.');
    } finally {
      setIsFinalising(false);
    }
  };

  const getToleranceForMetric = (metricNumber: number): ToleranceBand | null => {
    return tolerances.find((t) => t.metricNumber === metricNumber) ?? null;
  };

  return (
    <div className="space-y-6 rounded-2xl border border-ngm-border bg-white p-4 sm:p-6 shadow-sm">

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
              disabled={false}
            />
          ))}
      </div>

      {/* Finalize button - only show if not finalized OR if there are unsaved changes */}
      {(!period.isFinalised || hasUnsavedChanges) && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={handleFinalise}
            disabled={isFinalising}
            aria-label="Mark this reporting period as final"
            aria-busy={isFinalising}
            className="inline-flex items-center rounded-lg bg-ngm-cta px-4 py-2 text-sm font-semibold text-white shadow-xl hover:bg-ngm-cta-hover focus:outline-none focus:ring-2 focus:ring-ngm-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFinalising ? 'Finalising...' : hasUnsavedChanges ? 'Save & Finalise' : 'Finalise period'}
          </button>
        </div>
      )}
    </div>
  );
}
