'use client';

import { ReportingPeriod } from '@prisma/client';

type PeriodWithOptionalDescription = ReportingPeriod & { description?: string | null };

interface PeriodSelectorProps {
  periods: PeriodWithOptionalDescription[];
  showResume?: boolean;
}

export function PeriodSelector({ periods, showResume = false }: PeriodSelectorProps) {
  const draftPeriods = periods
    .filter(p => !p.isFinalised)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div>
      {draftPeriods.length === 0 ? (
        <div className="text-sm text-gray-600 text-left">
          No draft periods yet. Create one to start capturing metrics.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {draftPeriods.map((period) => (
            <div
              key={period.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm"
            >
              <div className="text-base font-semibold text-gray-900">{period.label}</div>
              {period.description && (
                <p className="mt-1 text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                  {period.description}
                </p>
              )}
              {showResume && (
                <div className="mt-3 flex justify-start">
                  <a
                    href={`/dashboard/${period.id}`}
                    className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
                  >
                    Resume
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

