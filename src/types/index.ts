import { ReportingPeriod, Metric, ToleranceBand, DashboardConfig } from '@prisma/client';

export type { ReportingPeriod, Metric, ToleranceBand, DashboardConfig };

export type TrendDirection = 'up' | 'down' | 'flat';

export interface Trend {
  direction: TrendDirection;
  values: number[];
}

export interface MetricWithTolerance extends Metric {
  tolerance?: ToleranceBand;
  trend?: Trend;
}

export interface PeriodWithMetrics extends ReportingPeriod {
  metrics: MetricWithTolerance[];
}

export interface CreatePeriodInput {
  label: string;
  startDate: Date;
  endDate: Date;
  description?: string;
}

export interface UpdateMetricInput {
  value?: number | null;
  isNA?: boolean;
  naReason?: string | null;
  insight?: string | null;
  hidden?: boolean;
}

export type RAGStatus = 'green' | 'amber' | 'red' | 'na';

