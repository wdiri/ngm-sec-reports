'use client';

import { ReportingPeriod } from '@prisma/client';
import Link from 'next/link';

type PeriodWithOptionalDescription = ReportingPeriod & { description?: string | null };

interface PeriodSelectorProps {
  periods: PeriodWithOptionalDescription[];
  showResume?: boolean;
}

export function PeriodSelector({ periods, showResume = false }: PeriodSelectorProps) {
  const draftPeriods = periods
    .filter(p => !p.isFinalised)
    .sort((a, b) => {
      const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return bDate.getTime() - aDate.getTime(); // Newest first
    });

  return (
    <div>
      {draftPeriods.length === 0 ? (
        <div className="text-sm text-gray-600 text-left">
          No draft periods yet. Create one to start capturing metrics.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {draftPeriods.map((period) => {
            const [month, year] = period.label.split(' ');
            return (
              <div
                key={period.id}
                className="rounded-xl border border-ngm-border bg-white px-4 py-4 text-center shadow-sm flex flex-col items-center justify-center"
              >
                <div className="text-base font-semibold text-gray-900">{month}</div>
                <div className="text-base font-semibold text-gray-900">{year}</div>
                {showResume && (
                  <div className="mt-3 flex justify-center">
                  <Link
                    href={`/dashboard/${period.id}`}
                    prefetch={false}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Resume
                  </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

