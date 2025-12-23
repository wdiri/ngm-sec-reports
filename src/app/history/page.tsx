'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { DashboardTable } from '@/components/DashboardTable';
import { calculateTrend } from '@/lib/trends';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [periods, setPeriods] = useState<(ReportingPeriod & { metrics: Metric[] })[]>([]);
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [periodsRes, tolerancesRes] = await Promise.all([
        fetch('/api/periods'),
        fetch('/api/tolerances'),
      ]);

      const periodsData = await periodsRes.json();
      const tolerancesData = await tolerancesRes.json();

      const finalisedPeriods = periodsData.filter((p: ReportingPeriod) => p.isFinalised);
      setPeriods(finalisedPeriods);
      setTolerances(tolerancesData);

      if (finalisedPeriods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(finalisedPeriods[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportPDF = async (periodId: string) => {
    try {
      const response = await fetch(`/api/export/pdf?periodId=${periodId}`);
      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-${periods.find(p => p.id === periodId)?.label || 'export'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportPPTX = async (periodId: string) => {
    try {
      const response = await fetch(`/api/export/pptx?periodId=${periodId}`);
      if (!response.ok) throw new Error('Failed to export PPTX');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-${periods.find(p => p.id === periodId)?.label || 'export'}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PowerPoint exported successfully');
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      toast.error('Failed to export PowerPoint');
    }
  };

  // Get selected period from ID
  const selectedPeriod = useMemo(() => {
    return selectedPeriodId ? periods.find(p => p.id === selectedPeriodId) || null : null;
  }, [selectedPeriodId, periods]);

  // Pre-calculate historical periods once (excluding selected)
  const historicalPeriods = useMemo(() => {
    return selectedPeriodId ? periods.filter(p => p.id !== selectedPeriodId) : [];
  }, [selectedPeriodId, periods]);

  // Calculate trends for selected period - memoized to prevent recalculation on every render
  // Use useMemo with proper dependencies to ensure updates happen immediately
  const metricsWithTrends = useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.metrics) return [];

    return selectedPeriod.metrics
      .filter(metric => !metric.hidden && !metric.isNA)
      .map(metric => {
        const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
        const trend = calculateTrend(metric.metricNumber, selectedPeriod, historicalPeriods, tolerance ?? null);
        return {
          ...metric,
          tolerance,
          trend,
        };
      });
  }, [selectedPeriod?.id, selectedPeriod?.metrics, historicalPeriods, tolerances]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ngm-bg pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6">
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-ngm-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Periods</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {periods.length} finalised
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {periods.map((period) => {
                const isSelected = selectedPeriodId === period.id;
                return (
                <div
                  key={period.id}
                  className={`rounded-xl border px-3 py-2 text-sm transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-ngm-primary bg-ngm-bg-alt text-ngm-primary shadow-sm'
                      : 'border-ngm-border bg-white hover:border-ngm-border hover:shadow-sm'
                  }`}
                  onClick={(e) => {
                    // Only trigger if not clicking on the Edit link
                    const target = e.target as HTMLElement;
                    if (target.closest('a') || target.tagName === 'A') {
                      return;
                    }
                    setSelectedPeriodId(period.id);
                  }}
                >
                  <div className="font-semibold mb-2 pointer-events-none">{period.label}</div>
                  <div className="flex justify-end mt-2 pointer-events-auto">
                    <Link
                      href={`/dashboard/${period.id}`}
                      prefetch={false}
                      className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

          <div className="lg:col-span-3">
            {selectedPeriod ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ngm-border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">{selectedPeriod.label}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleExportPDF(selectedPeriod.id)}
                        className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleExportPPTX(selectedPeriod.id)}
                        className="inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700"
                      >
                        Export PPTX
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <DashboardTable
                      period={selectedPeriod}
                      metrics={metricsWithTrends}
                      showSparkline={true}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ngm-border bg-white p-8 text-center text-gray-500 shadow-sm">
                Select a period to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
