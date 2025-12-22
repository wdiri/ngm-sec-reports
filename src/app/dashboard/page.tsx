'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReportingPeriod, Metric } from '@prisma/client';
import { PeriodSelector } from '@/components/PeriodSelector';
import { CreatePeriodModal } from '@/components/CreatePeriodModal';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [periods, setPeriods] = useState<(ReportingPeriod & { metrics: Metric[] })[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const periodsRes = await fetch('/api/periods');
      const periodsData = (await periodsRes.json()) as (ReportingPeriod & { metrics: Metric[] })[];
      setPeriods(periodsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePeriod = async (data: { label: string; startDate: Date; endDate: Date; description?: string }) => {
    const response = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create period');
    }
    const created = await response.json();
    setIsCreateModalOpen(false);
    router.push(`/dashboard/${created.id}`);
  };

  const finalisedPeriods = periods.filter(p => p.isFinalised);

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
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700"
          >
            + Create period
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Draft periods</h2>
                <p className="text-sm text-gray-600">Resume a saved draft to keep editing.</p>
              </div>
            </div>
            <PeriodSelector periods={periods} showResume />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Completed history</h2>
                <p className="text-sm text-gray-600">Open finalised reports to review or edit.</p>
              </div>
              <a href="/history" className="text-xs font-semibold text-purple-700 hover:underline">
                Open history
              </a>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {finalisedPeriods.map(period => (
                <a
                  key={period.id}
                  href={`/dashboard/${period.id}`}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 hover:border-purple-200 hover:shadow-sm"
                >
                  <div className="font-semibold">{period.label}</div>
                </a>
              ))}
              {finalisedPeriods.length === 0 && (
                <div className="text-sm text-gray-500">No finalised periods yet.</div>
              )}
            </div>
          </div>
        </div>

        <CreatePeriodModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePeriod}
        />
      </div>
    </div>
  );
}
