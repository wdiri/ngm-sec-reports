import { ReportingPeriod, Metric, ToleranceBand, DashboardConfig } from '@prisma/client';
import { z } from 'zod';

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

// Insights Types
export type InsightType = 'trend' | 'anomaly' | 'milestone' | 'comparison' | 'forecast' | 'correlation';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  severity?: InsightSeverity;
  metricKeys?: number[]; // metricNumbers
  period?: { start: string; end: string }; // YYYY-MM format
  evidence?: {
    values?: Array<{ month: string; value: number }>;
    changePct?: number;
    zScore?: number;
    notes?: string[];
  };
  recommendations?: string[];
  aiEnhanced?: boolean; // Flag to indicate if this insight was enhanced by AI
}

// Zod Validation Schemas

/**
 * Schema for creating a new reporting period
 */
export const CreatePeriodSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label must be 100 characters or less'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

/**
 * Schema for updating a metric
 */
export const UpdateMetricSchema = z.object({
  value: z.number().min(0, 'Value must be non-negative').max(1000000, 'Value too large').nullable().optional(),
  isNA: z.boolean().optional(),
  naReason: z.string().max(500, 'Reason must be 500 characters or less').nullable().optional(),
  insight: z.string().max(2000, 'Insight must be 2000 characters or less').nullable().optional(),
  hidden: z.boolean().optional(),
}).refine((data) => {
  // If isNA is true, value should be null
  if (data.isNA && data.value !== null && data.value !== undefined) {
    return false;
  }
  return true;
}, {
  message: 'Value must be null when metric is marked as N/A',
  path: ['value'],
});

/**
 * Schema for updating tolerance bands
 */
export const UpdateToleranceSchema = z.object({
  greenMin: z.number().nullable().optional(),
  greenMax: z.number().nullable().optional(),
  greenOperator: z.enum(['>=', '<=', '==', 'range']).optional(),
  amberMin: z.number().nullable().optional(),
  amberMax: z.number().nullable().optional(),
  amberOperator: z.enum(['>=', '<=', '==', 'range']).optional(),
  redMin: z.number().nullable().optional(),
  redMax: z.number().nullable().optional(),
  redOperator: z.enum(['>=', '<=', '==', 'range']).optional(),
  isLowerBetter: z.boolean().optional(),
  flatTolerance: z.number().min(0, 'Flat tolerance must be non-negative').optional(),
});

