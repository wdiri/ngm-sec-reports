import puppeteer from 'puppeteer';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { calculateRAG } from '@/lib/rag';
import { Trend, Insight } from '@/types';
import { getMetricName } from '@/lib/domain/metrics';

export async function generatePDF(
  period: ReportingPeriod & { metrics: Metric[] },
  metricsWithData: (Metric & { tolerance?: ToleranceBand | null; trend?: Trend | null })[],
  headerText: string
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  });

  try {
    const page = await browser.newPage();
    
    const html = generateHTML(period, metricsWithData, headerText);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '3mm',
        right: '3mm',
        bottom: '3mm',
        left: '3mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateHTML(
  period: ReportingPeriod,
  metrics: (Metric & { tolerance?: ToleranceBand | null; trend?: Trend | null })[],
  headerText: string
): string {
  const sortedMetrics = [...metrics].sort((a, b) => a.metricNumber - b.metricNumber);

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

  const getTrendDisplay = (trend: Trend | null, tolerance?: ToleranceBand | null) => {
    if (!trend || trend.values.length < 2) return { text: '-', color: '#9ca3af' };
    
    const firstValue = trend.values[0];
    const lastValue = trend.values[trend.values.length - 1];
    const changePct = firstValue !== 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
      : (lastValue - firstValue) * 100;
    
    // If change is effectively zero (within 0.1%), treat as flat
    const isEffectivelyFlat = Math.abs(changePct) < 0.1 || trend.direction === 'flat';
    
    if (isEffectivelyFlat) {
      return { text: '→ 0.0%', color: '#6b7280' };
    }
    
    const isLowerBetter = tolerance?.isLowerBetter ?? false;
    
    let text = '';
    let color = '#9ca3af';
    
    if (trend.direction === 'up') {
      text = isLowerBetter ? `↓ ${Math.abs(changePct).toFixed(1)}%` : `↑ +${changePct.toFixed(1)}%`;
      color = '#10b981';
    } else if (trend.direction === 'down') {
      text = isLowerBetter ? `↑ +${Math.abs(changePct).toFixed(1)}%` : `↓ ${changePct.toFixed(1)}%`;
      color = isLowerBetter ? '#10b981' : '#ef4444';
    } else {
      text = `→ ${changePct.toFixed(1)}%`;
      color = '#6b7280';
    }
    
    return { text, color };
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

  const rows = sortedMetrics.map((metric, index) => {
    const ragStatus = calculateRAG(metric.value, metric.tolerance ?? null);
    const ragColors = {
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
      na: '#9ca3af',
    };

    const getToleranceText = (tolerance: ToleranceBand | null) => {
      if (!tolerance) return 'N/A';

      const greenText = formatTolerance(tolerance.greenMin, tolerance.greenMax, tolerance.greenOperator);
      const amberText = formatTolerance(tolerance.amberMin, tolerance.amberMax, tolerance.amberOperator);
      const redText = formatTolerance(tolerance.redMin, tolerance.redMax, tolerance.redOperator);

      return `<div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #10b981; border-radius: 2px; flex-shrink: 0;"></span>
        <span style="white-space: nowrap;">${greenText || '-'}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #f59e0b; border-radius: 2px; flex-shrink: 0;"></span>
        <span style="white-space: nowrap;">${amberText || '-'}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #ef4444; border-radius: 2px; flex-shrink: 0;"></span>
        <span style="white-space: nowrap;">${redText || '-'}</span>
      </div>`;
    };
    
    const toleranceText = getToleranceText(metric.tolerance ?? null);

    const trendDisplay = getTrendDisplay(metric.trend ?? null, metric.tolerance ?? null);
    
    return `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="border: 1px solid #e5e7eb; padding: 4px 6px; vertical-align: top;">
          <div style="font-weight: 600; font-size: 10px; color: #1f2937; margin-bottom: 2px;">
            <span style="font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">M${metric.metricNumber}</span>
            <span> - </span>
            ${metric.name}
          </div>
          <div style="font-size: 8px; color: #6b7280; line-height: 1.2;">${metric.description}</div>
        </td>
        <td style="border: 1px solid #e5e7eb; padding: 4px 6px; vertical-align: top; font-size: 8px; line-height: 1.3;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0;">
            <div style="display: inline-block;">
              ${toleranceText}
            </div>
          </div>
        </td>
        <td style="border: 1px solid #e5e7eb; padding: 4px 6px; text-align: center; vertical-align: middle;">
          ${metric.isNA ? (
            '<span style="color: #9ca3af; font-size: 10px;">N/A</span>'
          ) : (
            `<span style="font-weight: 700; font-size: 11px; color: ${ragColors[ragStatus]};">${metric.value !== null ? formatMetricValue(metric.value, metric.unit) : '-'}</span>`
          )}
        </td>
        <td style="border: 1px solid #e5e7eb; padding: 4px 6px; text-align: center; vertical-align: middle;">
          <span style="font-size: 9px; font-weight: 600; color: ${trendDisplay.color};">${trendDisplay.text}</span>
        </td>
        <td style="border: 1px solid #e5e7eb; padding: 4px 6px; vertical-align: top; font-size: 8px; line-height: 1.3;">
          ${metric.insight || '-'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 3mm;
            font-size: 9px;
          }
          .header {
            margin-bottom: 3mm;
            text-align: center;
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 2mm;
          }
          .header h1 {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-top: 1mm;
          }
          th {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: white;
            font-weight: 700;
            padding: 6px 8px;
            text-align: left;
            border: 1px solid #5b21b6;
            font-size: 10px;
            letter-spacing: 0.3px;
          }
          th:nth-child(2) {
            text-align: center;
          }
          th:nth-child(3), th:nth-child(4) {
            text-align: center;
          }
          td {
            border: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cyber Security Metrics - ${period.label}</h1>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 38%;">Metric</th>
              <th style="width: 14%; text-align: center;">Tolerance</th>
              <th style="width: 12%; text-align: center;">Result</th>
              <th style="width: 8%; text-align: center;">Trend</th>
              <th style="width: 28%;">Insight</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

/**
 * Generate PDF for insights report
 */
export async function generateInsightsPDF(
  insights: Insight[],
  keyTakeaways: Insight[],
  timeRange: string
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  });

  try {
    const page = await browser.newPage();
    const html = generateInsightsHTML(insights, keyTakeaways, timeRange);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateInsightsHTML(
  insights: Insight[],
  keyTakeaways: Insight[],
  timeRange: string
): string {
  const severityColors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
  };

  const typeLabels = {
    trend: 'Trend',
    anomaly: 'Anomaly',
    milestone: 'Milestone',
    comparison: 'Comparison',
    forecast: 'Forecast',
    correlation: 'Correlation',
  };

  // Group insights by type
  const insightsByType: Record<string, Insight[]> = {
    trend: [],
    anomaly: [],
    milestone: [],
    comparison: [],
    forecast: [],
    correlation: [],
  };

  insights.forEach(insight => {
    if (insightsByType[insight.type]) {
      insightsByType[insight.type].push(insight);
    }
  });

  const renderInsight = (insight: Insight): string => {
    const severityBadge = insight.severity
      ? `<span style="display: inline-block; padding: 2px 8px; background-color: ${severityColors[insight.severity]}; color: white; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 8px;">${insight.severity.toUpperCase()}</span>`
      : '';
    
    const metricNames = insight.metricKeys?.map(mn => getMetricName(mn)).filter(Boolean).join(', ') || '';
    const metricsText = metricNames ? `<p style="font-size: 10px; color: #6b7280; margin: 4px 0;">Metrics: ${metricNames}</p>` : '';

    let evidenceHTML = '';
    if (insight.evidence) {
      if (insight.evidence.values && insight.evidence.values.length > 0) {
        const tableRows = insight.evidence.values.map(v => `
          <tr>
            <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb;">${v.month}</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${v.value.toFixed(1)}</td>
          </tr>
        `).join('');
        evidenceHTML += `
          <table style="width: 100%; margin-top: 8px; font-size: 10px; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 4px 8px; text-align: left; border-bottom: 1px solid #d1d5db;">Month</th>
                <th style="padding: 4px 8px; text-align: right; border-bottom: 1px solid #d1d5db;">Value</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        `;
      }
      if (insight.evidence.changePct !== undefined) {
        evidenceHTML += `<p style="font-size: 10px; margin-top: 4px;">Change: ${insight.evidence.changePct > 0 ? '+' : ''}${insight.evidence.changePct.toFixed(1)}%</p>`;
      }
      if (insight.evidence.zScore !== undefined) {
        evidenceHTML += `<p style="font-size: 10px; margin-top: 4px;">Z-Score: ${insight.evidence.zScore.toFixed(2)}</p>`;
      }
      if (insight.evidence.notes && insight.evidence.notes.length > 0) {
        const notesList = insight.evidence.notes.map(note => `<li style="margin: 2px 0;">${note}</li>`).join('');
        evidenceHTML += `<ul style="font-size: 10px; margin-top: 4px; padding-left: 20px;">${notesList}</ul>`;
      }
    }

    const recommendationsHTML = insight.recommendations && insight.recommendations.length > 0
      ? `<div style="margin-top: 8px; padding: 8px; background-color: #fef3c7; border-left: 3px solid #f59e0b;">
          <p style="font-size: 10px; font-weight: 600; margin: 0 0 4px 0;">Recommendations:</p>
          <ul style="font-size: 10px; margin: 0; padding-left: 20px;">
            ${insight.recommendations.map(rec => `<li style="margin: 2px 0;">${rec}</li>`).join('')}
          </ul>
        </div>`
      : '';

    return `
      <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #d1d5db; border-radius: 4px; background-color: #ffffff;">
        <div style="margin-bottom: 8px;">
          ${severityBadge}
          <span style="display: inline-block; padding: 2px 8px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 10px; font-weight: 600;">
            ${typeLabels[insight.type] || insight.type.toUpperCase()}
          </span>
        </div>
        <h3 style="font-size: 14px; font-weight: 600; margin: 8px 0 4px 0; color: #1f2937;">${insight.title}</h3>
        <p style="font-size: 11px; color: #374151; margin: 4px 0;">${insight.summary}</p>
        ${metricsText}
        ${evidenceHTML}
        ${recommendationsHTML}
      </div>
    `;
  };

  const keyTakeawaysHTML = keyTakeaways.length > 0
    ? `
      <div style="margin-bottom: 24px; padding: 16px; background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 4px;">
        <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #92400e;">This Month's Key Takeaways</h2>
        ${keyTakeaways.map(renderInsight).join('')}
      </div>
    `
    : '';

  const insightsByTypeHTML = Object.entries(insightsByType)
    .filter(([_, typeInsights]) => typeInsights.length > 0)
    .map(([type, typeInsights]) => `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #1f2937; border-bottom: 2px solid #7c3aed; padding-bottom: 4px;">
          ${typeLabels[type as keyof typeof typeLabels] || type} Insights (${typeInsights.length})
        </h2>
        ${typeInsights.map(renderInsight).join('')}
      </div>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1f2937;
          }
          .header {
            margin-bottom: 24px;
            text-align: center;
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 16px;
          }
          .header h1 {
            font-size: 24px;
            color: #1f2937;
            margin: 0 0 8px 0;
          }
          .header p {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Security Metrics Insights Report</h1>
          <p>Time Range: ${timeRange} | Generated: ${new Date().toLocaleDateString('en-AU')}</p>
        </div>
        ${keyTakeawaysHTML}
        ${insightsByTypeHTML}
        ${insights.length === 0 ? '<p style="text-align: center; color: #6b7280; padding: 40px;">No insights available for the selected filters.</p>' : ''}
      </body>
    </html>
  `;
}

