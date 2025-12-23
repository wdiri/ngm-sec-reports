'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReportingPeriod, Metric } from '@prisma/client';
import { PeriodSelector } from '@/components/PeriodSelector';
import { CreatePeriodModal } from '@/components/CreatePeriodModal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const finalisedPeriods = periods
    .filter(p => p.isFinalised)
    .sort((a, b) => {
      const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return bDate.getTime() - aDate.getTime(); // Newest first
    });

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
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-ngm-border bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Draft periods</h2>
                <p className="text-sm text-gray-600">Resume a saved draft to keep editing.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
              >
                + Create period
              </button>
            </div>
            <PeriodSelector periods={periods} showResume />
          </div>

          <div className="rounded-2xl border border-ngm-border bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Completed history</h2>
                <p className="text-sm text-gray-600">Open finalised reports to review or edit.</p>
              </div>
              <Link
                href="/history"
                className="inline-flex items-center rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 transition-colors"
              >
                Open history
              </Link>
            </div>
            {finalisedPeriods.length === 0 ? (
              <div className="text-sm text-gray-500 text-center">No finalised periods yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {finalisedPeriods.map(period => {
                  const [month, year] = period.label.split(' ');
                  return (
                    <div
                      key={period.id}
                      className="rounded-xl border border-ngm-border bg-white px-4 py-4 text-center shadow-sm flex flex-col items-center justify-center"
                    >
                      <div className="text-base font-semibold text-gray-900">{month}</div>
                      <div className="text-base font-semibold text-gray-900">{year}</div>
                      <div className="mt-3 flex justify-center">
                      <Link
                        href={`/dashboard/${period.id}`}
                        prefetch={false}
                        className="rounded-full bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors"
                      >
                        View
                      </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
