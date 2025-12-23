/**
 * Domain definitions for security metrics
 * Single source of truth for metric configuration
 */

export const METRIC_DEFINITIONS = [
  {
    number: 1,
    name: 'Critical systems security coverage',
    description: 'Percentage of critical systems with security coverage',
    unit: '%',
  },
  {
    number: 2,
    name: 'Security incidents resolved',
    description: 'Number of security incidents resolved within SLA',
    unit: 'count',
  },
  {
    number: 3,
    name: 'Vulnerability remediation time',
    description: 'Average time to remediate critical vulnerabilities',
    unit: 'hours',
  },
  {
    number: 4,
    name: 'Security awareness training completion',
    description: 'Percentage of staff who completed security awareness training',
    unit: '%',
  },
  {
    number: 5,
    name: 'Phishing simulation click rate',
    description: 'Percentage of staff who clicked on phishing simulation emails',
    unit: '%',
  },
  {
    number: 6,
    name: 'Security control effectiveness',
    description: 'Percentage of security controls operating effectively',
    unit: '%',
  },
  {
    number: 7,
    name: 'Mean time to detect (MTTD)',
    description: 'Average time to detect security incidents',
    unit: 'hours',
  },
  {
    number: 8,
    name: 'Mean time to respond (MTTR)',
    description: 'Average time to respond to security incidents',
    unit: 'hours',
  },
  {
    number: 9,
    name: 'Security policy compliance',
    description: 'Percentage of systems compliant with security policies',
    unit: '%',
  },
  {
    number: 10,
    name: 'Third-party security assessments',
    description: 'Number of third-party security assessments completed',
    unit: 'count',
  },
  {
    number: 11,
    name: 'Security budget utilization',
    description: 'Percentage of security budget utilized',
    unit: '%',
  },
] as const;

export type MetricDefinition = (typeof METRIC_DEFINITIONS)[number];

/**
 * Get metric name by number
 */
export function getMetricName(metricNumber: number): string {
  const metric = METRIC_DEFINITIONS.find((m) => m.number === metricNumber);
  return metric?.name ?? '';
}

/**
 * Get all metric names as a map
 */
export function getMetricNamesMap(): Record<number, string> {
  return Object.fromEntries(METRIC_DEFINITIONS.map((m) => [m.number, m.name]));
}

/**
 * Configuration constants
 */
export const CONFIG = {
  AUTO_SAVE_DEBOUNCE_MS: 2000,
  TREND_HISTORY_PERIODS: 6,
  METRIC_COUNT: 11,
} as const;
