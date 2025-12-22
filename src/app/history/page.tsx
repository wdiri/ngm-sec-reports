'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { DashboardTable } from '@/components/DashboardTable';
import { calculateTrend } from '@/lib/trends';
import Link from 'next/link';

export default function HistoryPage() {
  const [periods, setPeriods] = useState<(ReportingPeriod & { metrics: Metric[] })[]>([]);
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<(ReportingPeriod & { metrics: Metric[] }) | null>(null);
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

      if (finalisedPeriods.length > 0) {
        setSelectedPeriod(prev => prev ?? finalisedPeriods[0]);
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
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
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
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      alert('Failed to export PPTX');
    }
  };

  // Calculate trends for selected period
  const metricsWithTrends = selectedPeriod
    ? selectedPeriod.metrics
        .filter(metric => !metric.hidden && !metric.isNA)
        .map(metric => {
          const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
          const historicalPeriods = periods.filter(p => p.id !== selectedPeriod.id);
          const trend = calculateTrend(metric.metricNumber, selectedPeriod, historicalPeriods, tolerance ?? null);
          return {
            ...metric,
            tolerance,
            trend,
          };
        })
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Archive</p>
            <h1 className="text-3xl font-semibold text-gray-900">Historical Periods</h1>
            <p className="text-sm text-gray-600">Finalised sets ready for export.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Periods</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {periods.length} finalised
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    selectedPeriod?.id === period.id
                      ? 'border-purple-300 bg-purple-50 text-purple-900 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => setSelectedPeriod(period)}
                    className="w-full text-left"
                  >
                    <div className="font-semibold">{period.label}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(period.startDate).toLocaleDateString('en-AU')} -{' '}
                      {new Date(period.endDate).toLocaleDateString('en-AU')}
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <a
                      href={`/dashboard/${period.id}`}
                      className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                    >
                      Edit
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

          <div className="lg:col-span-3">
            {selectedPeriod ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">{selectedPeriod.label}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedPeriod.startDate).toLocaleDateString('en-AU')} – {new Date(selectedPeriod.endDate).toLocaleDateString('en-AU')}
                      </p>
                      {selectedPeriod.finalisedAt && (
                        <p className="text-xs text-gray-500">
                          Finalised {new Date(selectedPeriod.finalisedAt).toLocaleDateString('en-AU')}
                        </p>
                      )}
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
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 shadow-sm">
                Select a period to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
