import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateInsightsPDF } from '@/lib/export/pdf';
import { generateInsights } from '@/lib/insights/insightsEngine';
import { InsightType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = parseInt(searchParams.get('timeRange') || '12');
    const metricsParam = searchParams.get('metrics');
    const typesParam = searchParams.get('types');

    const metricNumbers = metricsParam ? metricsParam.split(',').map(Number).filter(n => !isNaN(n)) : undefined;
    const types = typesParam ? (typesParam.split(',') as InsightType[]) : undefined;

    // Fetch finalised periods with metrics
    const periods = await prisma.reportingPeriod.findMany({
      where: { isFinalised: true },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
      take: Math.max(timeRange, 24),
    });

    // Fetch tolerances
    const tolerances = await prisma.toleranceBand.findMany();

    // Generate insights
    const allInsights = generateInsights(periods, tolerances, {
      timeRange: timeRange > 0 ? timeRange : undefined,
      metricNumbers,
      types,
    });

    // Get most recent period for key takeaways
    const mostRecentPeriod = periods.length > 0
      ? periods.sort((a, b) => {
          const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
          const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
          return bDate.getTime() - aDate.getTime();
        })[0]
      : null;

    // Get key takeaways (critical and warning insights for most recent period)
    const keyTakeaways = mostRecentPeriod
      ? allInsights.filter(insight => {
          if (!insight.period) return false;
          const periodEnd = insight.period.end;
          const recentMonth = mostRecentPeriod.startDate instanceof Date
            ? mostRecentPeriod.startDate
            : new Date(mostRecentPeriod.startDate);
          const recentMonthStr = `${recentMonth.getFullYear()}-${String(recentMonth.getMonth() + 1).padStart(2, '0')}`;
          return periodEnd === recentMonthStr && (insight.severity === 'critical' || insight.severity === 'warning');
        }).slice(0, 5)
      : [];

    const timeRangeLabel = timeRange === 0
      ? 'All time'
      : timeRange === 3
      ? 'Last 3 months'
      : timeRange === 6
      ? 'Last 6 months'
      : timeRange === 12
      ? 'Last 12 months'
      : timeRange === 24
      ? 'Last 24 months'
      : `Last ${timeRange} months`;

    const pdfBuffer = await generateInsightsPDF(allInsights, keyTakeaways, timeRangeLabel);
    const pdfBody = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="insights-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating insights PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights PDF' },
      { status: 500 }
    );
  }
}

