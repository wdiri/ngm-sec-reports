import { PrismaClient } from '@prisma/client';

const METRIC_DEFINITIONS = [
  { number: 1, name: 'Critical systems security coverage', description: 'Percentage of critical systems with security coverage', unit: '%' },
  { number: 2, name: 'Security incidents resolved', description: 'Number of security incidents resolved within SLA', unit: 'count' },
  { number: 3, name: 'Vulnerability remediation time', description: 'Average time to remediate critical vulnerabilities', unit: 'hours' },
  { number: 4, name: 'Security awareness training completion', description: 'Percentage of staff who completed security awareness training', unit: '%' },
  { number: 5, name: 'Phishing simulation click rate', description: 'Percentage of staff who clicked on phishing simulation emails', unit: '%' },
  { number: 6, name: 'Security control effectiveness', description: 'Percentage of security controls operating effectively', unit: '%' },
  { number: 7, name: 'Mean time to detect (MTTD)', description: 'Average time to detect security incidents', unit: 'hours' },
  { number: 8, name: 'Mean time to respond (MTTR)', description: 'Average time to respond to security incidents', unit: 'hours' },
  { number: 9, name: 'Security policy compliance', description: 'Percentage of systems compliant with security policies', unit: '%' },
  { number: 10, name: 'Third-party security assessments', description: 'Number of third-party security assessments completed', unit: 'count' },
  { number: 11, name: 'Security budget utilization', description: 'Percentage of security budget utilized', unit: '%' },
];

const DEFAULT_TOLERANCES = [
  { number: 1, green: { min: 90, max: 100, op: 'range' }, amber: { min: 75, max: 89.9, op: 'range' }, red: { min: 0, max: 74.9, op: 'range' }, isLowerBetter: false, flatTolerance: 2.0 },
  { number: 2, green: { min: 95, max: null, op: '>=' }, amber: { min: 80, max: 94.9, op: 'range' }, red: { min: 0, max: 79.9, op: 'range' }, isLowerBetter: false, flatTolerance: 3.0 },
  { number: 3, green: { min: null, max: 24, op: '<=' }, amber: { min: 25, max: 48, op: 'range' }, red: { min: 49, max: null, op: '>=' }, isLowerBetter: true, flatTolerance: 2.0 },
  { number: 4, green: { min: 95, max: 100, op: 'range' }, amber: { min: 80, max: 94.9, op: 'range' }, red: { min: 0, max: 79.9, op: 'range' }, isLowerBetter: false, flatTolerance: 2.0 },
  { number: 5, green: { min: null, max: 5, op: '<=' }, amber: { min: 6, max: 15, op: 'range' }, red: { min: 16, max: null, op: '>=' }, isLowerBetter: true, flatTolerance: 1.0 },
  { number: 6, green: { min: 90, max: 100, op: 'range' }, amber: { min: 75, max: 89.9, op: 'range' }, red: { min: 0, max: 74.9, op: 'range' }, isLowerBetter: false, flatTolerance: 2.0 },
  { number: 7, green: { min: null, max: 2, op: '<=' }, amber: { min: 3, max: 6, op: 'range' }, red: { min: 7, max: null, op: '>=' }, isLowerBetter: true, flatTolerance: 0.5 },
  { number: 8, green: { min: null, max: 4, op: '<=' }, amber: { min: 5, max: 12, op: 'range' }, red: { min: 13, max: null, op: '>=' }, isLowerBetter: true, flatTolerance: 1.0 },
  { number: 9, green: { min: 95, max: 100, op: 'range' }, amber: { min: 85, max: 94.9, op: 'range' }, red: { min: 0, max: 84.9, op: 'range' }, isLowerBetter: false, flatTolerance: 2.0 },
  { number: 10, green: { min: 4, max: null, op: '>=' }, amber: { min: 2, max: 3, op: 'range' }, red: { min: 0, max: 1, op: 'range' }, isLowerBetter: false, flatTolerance: 1.0 },
  { number: 11, green: { min: 85, max: 95, op: 'range' }, amber: { min: 70, max: 84.9, op: 'range' }, red: { min: null, max: 69.9, op: '<=' }, isLowerBetter: false, flatTolerance: 3.0 },
];

const MONTHS = [
  { label: 'May 2024', start: new Date('2024-05-01'), end: new Date('2024-05-31') },
  { label: 'June 2024', start: new Date('2024-06-01'), end: new Date('2024-06-30') },
  { label: 'July 2024', start: new Date('2024-07-01'), end: new Date('2024-07-31') },
  { label: 'August 2024', start: new Date('2024-08-01'), end: new Date('2024-08-31') },
  { label: 'September 2024', start: new Date('2024-09-01'), end: new Date('2024-09-30') },
  { label: 'October 2024', start: new Date('2024-10-01'), end: new Date('2024-10-31') },
  { label: 'November 2024', start: new Date('2024-11-01'), end: new Date('2024-11-30') },
  { label: 'December 2024', start: new Date('2024-12-01'), end: new Date('2024-12-31') },
];

const BASE_VALUES: Record<number, number[]> = {
  1: [85, 87, 89, 91, 92, 93, 94, 95],
  2: [88, 90, 92, 91, 93, 94, 95, 96],
  3: [30, 28, 26, 25, 24, 23, 22, 21],
  4: [82, 84, 86, 88, 89, 90, 91, 92],
  5: [12, 11, 10, 9, 8, 7, 6, 5],
  6: [78, 80, 82, 84, 85, 86, 87, 88],
  7: [4, 3.5, 3, 2.5, 2.5, 2, 2, 2],
  8: [8, 7, 6, 5.5, 5, 4.5, 4, 4],
  9: [88, 90, 91, 92, 93, 94, 95, 96],
  10: [2, 2, 3, 3, 3, 4, 4, 4],
  11: [75, 78, 80, 82, 85, 88, 90, 92],
};

const INSIGHTS: Record<number, string[]> = {
  1: [
    'Continued rollout of security controls across critical systems',
    'Additional systems onboarded to security monitoring platform',
    'New security tools deployed, improving coverage',
    'Security coverage expanded to include cloud infrastructure',
    'Coverage improvements from automation initiatives',
    'Enhanced monitoring capabilities added',
    'Final systems integrated into security framework',
    'Target coverage achieved across all critical systems',
  ],
  2: [
    'SLA performance below target, investigating root causes',
    'Process improvements implemented, seeing early results',
    'Incident response team efficiency improving',
    'Automation reducing manual intervention time',
    'Strong performance maintained with increased volume',
    'Best month for incident resolution performance',
    'Consistent high performance across all incident types',
    'Exceeding targets with optimized processes',
  ],
  3: [
    'Vulnerability backlog being addressed systematically',
    'Prioritization framework improving remediation speed',
    'Automated patching reducing critical vulnerability exposure',
    'Patch management process streamlined',
    'Remediation times improving with dedicated resources',
    'Critical vulnerabilities prioritized and resolved faster',
    'Automation significantly reducing manual effort',
    'Target remediation time consistently achieved',
  ],
  4: [
    'Training program launched, initial uptake good',
    'Mandatory training completion tracking implemented',
    'Training completion rates improving month over month',
    'Additional training sessions scheduled to meet demand',
    'High engagement with security awareness content',
    'Training program expanded to include contractors',
    'Near universal completion achieved',
    'Training program fully embedded in onboarding',
  ],
  5: [
    'Phishing simulation results show need for improvement',
    'Targeted training delivered to high-risk groups',
    'Click rates declining as awareness increases',
    'Improved email filtering reducing exposure',
    'Continued decline in click rates',
    'Best performance yet, training effective',
    'Click rates at acceptable levels',
    'Phishing resilience significantly improved',
  ],
  6: [
    'Control effectiveness review identified gaps',
    'Remediation actions underway for ineffective controls',
    'Control improvements showing positive impact',
    'Enhanced monitoring improving control visibility',
    'Control effectiveness trending upward',
    'Most controls operating within acceptable parameters',
    'Strong control performance across all domains',
    'Control framework operating at optimal levels',
  ],
  7: [
    'Detection capabilities being enhanced',
    'New SIEM rules improving detection speed',
    'Detection times improving with better tooling',
    'Automated detection reducing manual effort',
    'Detection performance consistently strong',
    'Best-in-class detection times achieved',
    'Detection capabilities at target levels',
    'Maintaining excellent detection performance',
  ],
  8: [
    'Response processes being optimized',
    'Response team efficiency improving',
    'Automated response playbooks reducing time',
    'Response times trending downward',
    'Consistent improvement in response performance',
    'Response capabilities at target levels',
    'Excellent response performance maintained',
    'Response times consistently within target',
  ],
  9: [
    'Compliance monitoring enhanced',
    'Policy compliance improving across systems',
    'Automated compliance checking deployed',
    'Compliance rates trending upward',
    'Strong compliance performance maintained',
    'Near universal compliance achieved',
    'Compliance framework operating effectively',
    'Compliance at optimal levels',
  ],
  10: [
    'Third-party assessment schedule established',
    'Assessments proceeding as planned',
    'Assessment program fully operational',
    'Comprehensive assessments completed',
    'Assessment coverage expanding',
    'All planned assessments completed',
    'Assessment program delivering value',
    'Assessment schedule maintained and expanded',
  ],
  11: [
    'Budget utilization tracking implemented',
    'Budget spend aligned with plan',
    'Strategic investments in security tools',
    'Budget utilization optimized',
    'Efficient use of security budget',
    'Budget performance strong',
    'Budget utilization at target levels',
    'Budget efficiently deployed across priorities',
  ],
};

export async function seedSampleData(prisma: PrismaClient) {
  await prisma.dashboardConfig.upsert({
    where: { id: 'config' },
    update: {},
    create: {
      id: 'config',
      headerText: 'Example dashboard - Presented at CORF / TRGC and input to ERC/BRC',
    },
  });

  for (const tol of DEFAULT_TOLERANCES) {
    await prisma.toleranceBand.upsert({
      where: { metricNumber: tol.number },
      update: {},
      create: {
        metricNumber: tol.number,
        greenMin: tol.green.min,
        greenMax: tol.green.max,
        greenOperator: tol.green.op,
        amberMin: tol.amber.min,
        amberMax: tol.amber.max,
        amberOperator: tol.amber.op,
        redMin: tol.red.min,
        redMax: tol.red.max,
        redOperator: tol.red.op,
        isLowerBetter: tol.isLowerBetter,
        flatTolerance: tol.flatTolerance,
      },
    });
  }

  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const finalisedAt = new Date(month.end);
    finalisedAt.setHours(23, 59, 59);

    await prisma.reportingPeriod.create({
      data: {
        label: month.label,
        startDate: month.start,
        endDate: month.end,
        isFinalised: true,
        finalisedAt,
        metrics: {
          create: METRIC_DEFINITIONS.map((def) => ({
            metricNumber: def.number,
            name: def.name,
            description: def.description,
            value: BASE_VALUES[def.number][i],
            unit: def.unit,
            isNA: false,
            insight: INSIGHTS[def.number][i],
          })),
        },
      },
    });
  }

  return { createdPeriods: MONTHS.length, createdMetrics: MONTHS.length * METRIC_DEFINITIONS.length };
}

export async function deleteSeedData(prisma: PrismaClient) {
  const labels = MONTHS.map((m) => m.label);
  const result = await prisma.reportingPeriod.deleteMany({ where: { label: { in: labels }, isFinalised: true } });
  return { deleted: result.count };
}

export async function getDataStatus(prisma: PrismaClient) {
  const labels = MONTHS.map((m) => m.label);
  const [periods, drafts, seedPeriods] = await Promise.all([
    prisma.reportingPeriod.count(),
    prisma.reportingPeriod.count({ where: { isFinalised: false } }),
    prisma.reportingPeriod.count({ where: { label: { in: labels }, isFinalised: true } }),
  ]);

  return { periods, drafts, seedPeriods };
}
