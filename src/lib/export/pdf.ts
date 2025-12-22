import puppeteer from 'puppeteer';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';
import { calculateRAG } from '@/lib/rag';
import { Trend } from '@/types';

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

function generateHTML(
  period: ReportingPeriod,
  metrics: (Metric & { tolerance?: ToleranceBand | null; trend?: Trend | null })[],
  headerText: string
): string {
  const sortedMetrics = [...metrics].sort((a, b) => a.metricNumber - b.metricNumber);

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

  const getTrendArrow = (trend: Trend | null) => {
    if (!trend || trend.values.length < 2) return '-';
    const arrows = { up: '↑', down: '↓', flat: '→' };
    return arrows[trend.direction];
  };

  const rows = sortedMetrics.map((metric, index) => {
    const ragStatus = calculateRAG(metric.value, metric.tolerance ?? null);
    const ragColors = {
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
      na: '#9ca3af',
    };

    return `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="border: 1px solid #d1d5db; padding: 12px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${metric.name}</div>
          <div style="font-size: 12px; color: #6b7280;">${metric.description}</div>
        </td>
        <td style="border: 1px solid #d1d5db; padding: 12px; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #10b981;"></div>
            <span>${formatTolerance(metric.tolerance?.greenMin ?? null, metric.tolerance?.greenMax ?? null, metric.tolerance?.greenOperator ?? '')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #f59e0b;"></div>
            <span>${formatTolerance(metric.tolerance?.amberMin ?? null, metric.tolerance?.amberMax ?? null, metric.tolerance?.amberOperator ?? '')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #ef4444;"></div>
            <span>${formatTolerance(metric.tolerance?.redMin ?? null, metric.tolerance?.redMax ?? null, metric.tolerance?.redOperator ?? '')}</span>
          </div>
        </td>
        <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center;">
          ${metric.isNA ? (
            '<span style="color: #9ca3af;">N/A</span>'
          ) : (
            `<span style="font-weight: 600; color: ${ragColors[ragStatus]};">${metric.value !== null ? `${metric.value}${metric.unit}` : '-'}</span>`
          )}
        </td>
        <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 18px; font-weight: 600;">
          ${getTrendArrow(metric.trend ?? null)}
        </td>
        <td style="border: 1px solid #d1d5db; padding: 12px; font-size: 12px;">
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
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            margin-bottom: 20px;
            text-align: center;
          }
          .header h1 {
            font-size: 18px;
            color: #1f2937;
            margin: 0 0 8px 0;
          }
          .header p {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background-color: #7c3aed;
            color: white;
            font-weight: 600;
            padding: 12px;
            text-align: left;
            border: 1px solid #d1d5db;
          }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${headerText}</h1>
          <p>Period: ${period.label} | Generated: ${new Date().toLocaleDateString('en-AU')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Metric</th>
              <th style="width: 12%; text-align: center;">Tolerance</th>
              <th style="width: 10%; text-align: center;">${period.label}</th>
              <th style="width: 10%; text-align: center;">Trend</th>
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

