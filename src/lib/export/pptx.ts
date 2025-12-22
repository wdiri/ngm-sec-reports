import PptxGenJS from 'pptxgenjs';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { calculateRAG } from '@/lib/rag';
import { Trend } from '@/types';

export async function generatePPTX(
  period: ReportingPeriod & { metrics: Metric[] },
  metricsWithData: (Metric & { tolerance?: ToleranceBand | null; trend?: Trend | null })[],
  headerText: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const slide = pptx.addSlide();

  // Header
  slide.addText(headerText, {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.4,
    fontSize: 14,
    bold: true,
    align: 'center',
  });

  slide.addText(`Period: ${period.label} | Generated: ${new Date().toLocaleDateString('en-AU')}`, {
    x: 0.5,
    y: 0.7,
    w: 9,
    h: 0.3,
    fontSize: 10,
    align: 'center',
    color: '666666',
  });

  // Table
  const sortedMetrics = [...metricsWithData].sort((a, b) => a.metricNumber - b.metricNumber);

  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Metric', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 10 } },
      { text: 'Tolerance', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 10, align: 'center' } },
      { text: period.label, options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 10, align: 'center' } },
      { text: 'Trend', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 10, align: 'center' } },
      { text: 'Insight', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 10 } },
    ],
  ];

  sortedMetrics.forEach((metric, index) => {
    const ragStatus = calculateRAG(metric.value, metric.tolerance ?? null);
    const ragColors = {
      green: '10b981',
      amber: 'f59e0b',
      red: 'ef4444',
      na: '9ca3af',
    };

    const formatTolerance = (min: number | null, max: number | null, operator: string) => {
      switch (operator) {
        case '>=':
          return min !== null ? `>=${min}` : '';
        case '<=':
          return max !== null ? `<=${max}` : '';
        case '==':
          return min !== null ? `=${min}` : '';
        case 'range':
          if (min !== null && max !== null) return `${min}-${max}`;
          if (min !== null) return `>=${min}`;
          if (max !== null) return `<=${max}`;
          return '';
        default:
          return '';
      }
    };

    const toleranceText = metric.tolerance
      ? `G: ${formatTolerance(metric.tolerance.greenMin, metric.tolerance.greenMax, metric.tolerance.greenOperator)}\nA: ${formatTolerance(metric.tolerance.amberMin, metric.tolerance.amberMax, metric.tolerance.amberOperator)}\nR: ${formatTolerance(metric.tolerance.redMin, metric.tolerance.redMax, metric.tolerance.redOperator)}`
      : 'N/A';

    const getTrendArrow = (trend: Trend | null) => {
      if (!trend || trend.values.length < 2) return '-';
      const arrows = { up: '↑', down: '↓', flat: '→' };
      return arrows[trend.direction];
    };

    const valueText = metric.isNA
      ? 'N/A'
      : metric.value !== null
      ? `${metric.value}${metric.unit}`
      : '-';

    const rowBgColor = index % 2 === 0 ? 'FFFFFF' : 'F9FAFB';

    tableData.push([
      {
        text: `${metric.name}\n${metric.description}`,
        options: {
          fill: { color: rowBgColor },
          fontSize: 9,
          valign: 'middle',
        },
      },
      {
        text: toleranceText,
        options: {
          fill: { color: rowBgColor },
          fontSize: 8,
          align: 'center',
          valign: 'middle',
        },
      },
      {
        text: valueText,
        options: {
          fill: { color: rowBgColor },
          fontSize: 10,
          bold: true,
          color: ragColors[ragStatus],
          align: 'center',
          valign: 'middle',
        },
      },
      {
        text: getTrendArrow(metric.trend ?? null),
        options: {
          fill: { color: rowBgColor },
          fontSize: 16,
          align: 'center',
          valign: 'middle',
        },
      },
      {
        text: metric.insight || '-',
        options: {
          fill: { color: rowBgColor },
          fontSize: 9,
          valign: 'middle',
        },
      },
    ]);
  });

  slide.addTable(tableData, {
    x: 0.5,
    y: 1.2,
    w: 9,
    colW: [3.6, 1.08, 0.9, 0.9, 2.52],
    border: { type: 'solid', color: 'D1D5DB', pt: 1 },
    fontSize: 9,
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

