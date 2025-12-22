'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { MetricsEntryForm } from '@/components/MetricsEntryForm';
import { DashboardTable } from '@/components/DashboardTable';
import { calculateTrend } from '@/lib/trends';

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<(ReportingPeriod & { metrics: Metric[] }) | null>(null);
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [periodRes, tolerancesRes] = await Promise.all([
        fetch(`/api/periods/${params.id}`),
        fetch('/api/tolerances'),
      ]);
      if (!periodRes.ok) {
        throw new Error('Period not found');
      }
      const periodData = (await periodRes.json()) as ReportingPeriod & { metrics: Metric[] };
      const tolerancesData = (await tolerancesRes.json()) as ToleranceBand[];
      setPeriod(periodData);
      setTolerances(tolerancesData);
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Draft not found');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateMetric = async (metricId: string, updates: Partial<Metric>) => {
    if (!period) return;
    const res = await fetch(`/api/metrics/${metricId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update metric');
    const updatedMetric = await res.json();
    setPeriod(prev => {
      if (!prev) return null;
      return { ...prev, metrics: prev.metrics.map(m => (m.id === metricId ? updatedMetric : m)) };
    });
  };

  const handleSave = async () => {
    if (!period) return;
    await loadData();
  };

  const handleFinalise = async () => {
    if (!period) return;
    const res = await fetch(`/api/periods/${period.id}/finalise`, { method: 'POST' });
    if (!res.ok) {
      alert('Failed to finalise');
      return;
    }
    await loadData();
    router.push('/dashboard');
  };

  const handleDeleteDraft = async () => {
    if (!period) return;
    const confirmed = confirm(
      period.isFinalised
        ? 'Delete this finalised period? This action cannot be undone.'
        : 'Delete this draft? This only removes the selected draft period.'
    );
    if (!confirmed) return;

    const res = await fetch(`/api/periods/${period.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete draft');
      return;
    }
    router.push('/dashboard');
  };

  if (isLoading || !period) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading draft...</div>
      </div>
    );
  }

  const metricsWithTrends = period.metrics
    .filter(metric => !metric.hidden && !metric.isNA)
    .map(metric => {
      const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
      const historicalPeriods: (ReportingPeriod & { metrics: Metric[] })[] = []; // Not showing history comparisons on this page
      const trend = calculateTrend(metric.metricNumber, period, historicalPeriods, tolerance ?? null);
      return { ...metric, tolerance, trend };
    });

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              Back to dashboard
            </button>
            <button
              onClick={handleDeleteDraft}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              {period.isFinalised ? 'Delete period' : 'Delete draft'}
            </button>
          </div>
          <div className="text-right text-sm font-semibold text-gray-700">{period.label}</div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <MetricsEntryForm
              period={period}
              metrics={period.metrics}
              tolerances={tolerances}
              onUpdate={handleUpdateMetric}
              onSave={handleSave}
              onFinalise={handleFinalise}
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Preview</p>
                  <h2 className="text-lg font-semibold text-gray-900">Board-ready view</h2>
                </div>
              </div>
              <div className="mt-3 max-h-[520px] overflow-auto">
                <DashboardTable period={period} metrics={metricsWithTrends} showSparkline={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
