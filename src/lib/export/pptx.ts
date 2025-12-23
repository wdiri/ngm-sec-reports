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
  slide.addText(`Cyber Security Metrics - ${period.label}`, {
    x: 0.2,
    y: 0.05,
    w: 9.6,
    h: 0.3,
    fontSize: 14,
    bold: true,
    align: 'center',
    color: '1f2937',
  });

  // Table
  const sortedMetrics = [...metricsWithData].sort((a, b) => a.metricNumber - b.metricNumber);

  const formatTolerance = (min: number | null, max: number | null, operator: string) => {
    switch (operator) {
      case '>=':
        return min !== null ? `≥${min}` : '';
      case '<=':
        return max !== null ? `≤${max}` : '';
      case '==':
        return min !== null ? `=${min}` : '';
      case 'range':
        if (min !== null && max !== null) return `${min}-${max}`;
        if (min !== null) return `≥${min}`;
        if (max !== null) return `≤${max}`;
        return '';
      default:
        return '';
    }
  };

  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === 'count') {
      return value.toString();
    }
    if (unit === '%') {
      return `${value.toFixed(1)} %`;
    }
    if (unit === 'hours') {
      return `${value.toFixed(1)} H`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Metric', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 9 } },
      { text: 'Tolerance', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 9, align: 'center' } },
      { text: 'Result', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 9, align: 'center' } },
      { text: 'Trend', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 9, align: 'center' } },
      { text: 'Insight', options: { fill: { color: '7c3aed' }, color: 'FFFFFF', bold: true, fontSize: 9 } },
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

    const toleranceText = metric.tolerance
      ? `🟢 ${formatTolerance(metric.tolerance.greenMin, metric.tolerance.greenMax, metric.tolerance.greenOperator)}\n🟡 ${formatTolerance(metric.tolerance.amberMin, metric.tolerance.amberMax, metric.tolerance.amberOperator)}\n🔴 ${formatTolerance(metric.tolerance.redMin, metric.tolerance.redMax, metric.tolerance.redOperator)}`
      : 'N/A';

  const getTrendDisplay = (trend: Trend | null, tolerance?: ToleranceBand | null) => {
    if (!trend || trend.values.length < 2) return { text: '-', color: '9ca3af' };
    
    const firstValue = trend.values[0];
    const lastValue = trend.values[trend.values.length - 1];
    const changePct = firstValue !== 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
      : (lastValue - firstValue) * 100;
    
    // If change is effectively zero (within 0.1%), treat as flat
    const isEffectivelyFlat = Math.abs(changePct) < 0.1 || trend.direction === 'flat';
    
    if (isEffectivelyFlat) {
      return { text: '→ 0.0%', color: '6b7280' };
    }
    
    const isLowerBetter = tolerance?.isLowerBetter ?? false;
    
    let text = '';
    let color = '9ca3af';
    
    if (trend.direction === 'up') {
      text = isLowerBetter ? `↓ ${Math.abs(changePct).toFixed(1)}%` : `↑ +${changePct.toFixed(1)}%`;
      color = '10b981';
    } else if (trend.direction === 'down') {
      text = isLowerBetter ? `↑ +${Math.abs(changePct).toFixed(1)}%` : `↓ ${changePct.toFixed(1)}%`;
      color = isLowerBetter ? '10b981' : 'ef4444';
    } else {
      text = `→ ${changePct.toFixed(1)}%`;
      color = '6b7280';
    }
    
    return { text, color };
  };

    const valueText = metric.isNA
      ? 'N/A'
      : metric.value !== null
      ? formatMetricValue(metric.value, metric.unit)
      : '-';

    const rowBgColor = index % 2 === 0 ? 'FFFFFF' : 'F9FAFB';

    const trendDisplay = getTrendDisplay(metric.trend ?? null, metric.tolerance ?? null);
    
    tableData.push([
      {
        text: `M${metric.metricNumber} - ${metric.name}\n${metric.description}`,
        options: {
          fill: { color: rowBgColor },
          fontSize: 8,
          valign: 'top',
        },
      },
      {
        text: toleranceText,
        options: {
          fill: { color: rowBgColor },
          fontSize: 7,
          align: 'left',
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
        text: trendDisplay.text,
        options: {
          fill: { color: rowBgColor },
          fontSize: 8,
          bold: true,
          color: trendDisplay.color,
          align: 'center',
          valign: 'middle',
        },
      },
      {
        text: metric.insight || '-',
        options: {
          fill: { color: rowBgColor },
          fontSize: 7,
          valign: 'top',
        },
      },
    ]);
  });

  slide.addTable(tableData, {
    x: 0.2,
    y: 0.4,
    w: 9.6,
    h: 7.0,
    colW: [3.6, 1.4, 1.1, 1.0, 2.5],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontSize: 7,
    align: 'left',
    valign: 'top',
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

