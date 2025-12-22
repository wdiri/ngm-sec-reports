import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePDF } from '@/lib/export/pdf';
import { calculateTrend } from '@/lib/trends';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get('periodId');

    if (!periodId) {
      return NextResponse.json({ error: 'periodId is required' }, { status: 400 });
    }

    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Get tolerances and historical periods for trends
    const [tolerances, historicalPeriods] = await Promise.all([
      prisma.toleranceBand.findMany(),
      prisma.reportingPeriod.findMany({
        where: { isFinalised: true, id: { not: periodId } },
        include: { metrics: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    // Calculate trends
    const metricsWithData = period.metrics
      .filter(metric => !metric.hidden && !metric.isNA)
      .map(metric => {
        const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
        const trend = calculateTrend(metric.metricNumber, period, historicalPeriods, tolerance ?? null);
        return {
          ...metric,
          tolerance,
          trend,
        };
      });

    // Get dashboard config
    const config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
    });

    const pdfBuffer = await generatePDF(period, metricsWithData, config?.headerText || 'Cyber Security Reporting - Period');
    const pdfBody = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="metrics-${period.label}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

