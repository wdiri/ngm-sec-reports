import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePeriodInput } from '@/types';

export async function GET() {
  try {
    const periods = await prisma.reportingPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });
    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePeriodInput = await request.json();
    const { label, startDate, endDate } = body;

    // Check if label already exists
    const existing = await prisma.reportingPeriod.findUnique({
      where: { label },
    });

    if (existing) {
      return NextResponse.json({ error: 'Period label already exists' }, { status: 400 });
    }

    // Create period with default metrics
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

    const period = await prisma.reportingPeriod.create({
      data: {
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metrics: {
          create: METRIC_DEFINITIONS.map(def => ({
            metricNumber: def.number,
            name: def.name,
            description: def.description,
            unit: def.unit,
            value: null,
            isNA: false,
          })),
        },
      },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}

