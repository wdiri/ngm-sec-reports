'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { MetricsEntryForm } from '@/components/MetricsEntryForm';
import { DashboardTable } from '@/components/DashboardTable';
import { calculateTrend } from '@/lib/trends';
import toast from 'react-hot-toast';

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<(ReportingPeriod & { metrics: Metric[] }) | null>(null);
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      // Use Promise.allSettled to prevent one failure from blocking the other
      const [periodResult, tolerancesResult] = await Promise.allSettled([
        fetch(`/api/periods/${params.id}`),
        fetch('/api/tolerances'),
      ]);
      
      if (periodResult.status === 'rejected' || !periodResult.value.ok) {
        throw new Error('Period not found');
      }
      
      const periodData = (await periodResult.value.json()) as ReportingPeriod & { metrics: Metric[] };
      const tolerancesData = tolerancesResult.status === 'fulfilled' && tolerancesResult.value.ok
        ? (await tolerancesResult.value.json()) as ToleranceBand[]
        : [];
      
      setPeriod(periodData);
      setTolerances(tolerancesData);
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Draft not found');
      router.push('/dashboard');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
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
    // Don't show loading state on autosave to prevent remounting and losing editing state
    await loadData(false);
  };

  const handleFinalise = async () => {
    if (!period) return;
    const res = await fetch(`/api/periods/${period.id}/finalise`, { method: 'POST' });
    if (!res.ok) {
      toast.error('Failed to finalise');
      return;
    }
    await loadData();
    toast.success('Period finalised successfully');
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
      toast.error('Failed to delete draft');
      return;
    }
    toast.success('Period deleted successfully');
    router.push('/dashboard');
  };

  const handleExportPDF = async () => {
    if (!period) return;
    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      const response = await fetch(`/api/export/pdf?periodId=${period.id}`);
      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${period.label.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF exported successfully', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF', { id: 'pdf-export' });
    }
  };

  const handleExportPPTX = async () => {
    if (!period) return;
    try {
      toast.loading('Generating PowerPoint...', { id: 'pptx-export' });
      const response = await fetch(`/api/export/pptx?periodId=${period.id}`);
      if (!response.ok) throw new Error('Failed to export PPTX');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${period.label.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PowerPoint exported successfully', { id: 'pptx-export' });
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      toast.error('Failed to export PowerPoint', { id: 'pptx-export' });
    }
  };

  if (isLoading || !period) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading draft...</div>
      </div>
    );
  }

  // Load historical periods for trend calculation (only for finalised periods)
  const [historicalPeriods, setHistoricalPeriods] = useState<(ReportingPeriod & { metrics: Metric[] })[]>([]);

  useEffect(() => {
    if (period?.isFinalised) {
      fetch('/api/periods')
        .then(res => res.json())
        .then((allPeriods: (ReportingPeriod & { metrics: Metric[] })[]) => {
          const historical = allPeriods
            .filter(p => p.isFinalised && p.id !== period.id)
            .sort((a, b) => {
              const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
              const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
              return bDate.getTime() - aDate.getTime();
            });
          setHistoricalPeriods(historical);
        })
        .catch(console.error);
    }
  }, [period?.id, period?.isFinalised]);

  const metricsWithTrends = period.metrics
    .filter(metric => !metric.hidden && !metric.isNA)
    .map(metric => {
      const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
      const trend = calculateTrend(metric.metricNumber, period, historicalPeriods, tolerance ?? null);
      return { ...metric, tolerance, trend };
    });

  return (
    <div className="min-h-screen bg-ngm-bg pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-lg border border-ngm-border px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              Back to dashboard
            </button>
            {period.isFinalised && (
              <>
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
                >
                  Export PDF
                </button>
                <button
                  onClick={handleExportPPTX}
                  className="inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700"
                >
                  Export PPTX
                </button>
              </>
            )}
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
            <div className="rounded-2xl border border-ngm-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
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
