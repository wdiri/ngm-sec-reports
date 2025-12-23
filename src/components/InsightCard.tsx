'use client';

import { useState } from 'react';
import { Insight } from '@/types';
import { Sparkline } from './Sparkline';
import { getMetricName } from '@/lib/domain/metrics';

interface InsightCardProps {
  insight: Insight;
  tolerances?: Array<{ metricNumber: number; isLowerBetter: boolean }>;
}

export function InsightCard({ insight, tolerances }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityColors = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const typeColors = {
    trend: 'bg-purple-50 text-purple-700',
    anomaly: 'bg-orange-50 text-orange-700',
    milestone: 'bg-green-50 text-green-700',
    comparison: 'bg-blue-50 text-blue-700',
    forecast: 'bg-indigo-50 text-indigo-700',
    correlation: 'bg-pink-50 text-pink-700',
  };

  const hasEvidence = insight.evidence && (
    insight.evidence.values ||
    insight.evidence.changePct !== undefined ||
    insight.evidence.zScore !== undefined ||
    insight.evidence.notes
  );

  const metricNames = insight.metricKeys?.map(mn => getMetricName(mn)).filter(Boolean) || [];
  const isLowerBetter = insight.metricKeys?.[0] 
    ? tolerances?.find(t => t.metricNumber === insight.metricKeys![0])?.isLowerBetter || false
    : false;

  return (
    <div className="border border-ngm-border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[insight.type] || 'bg-gray-100 text-gray-700'}`}>
                {insight.type.toUpperCase()}
              </span>
              {insight.severity && (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${severityColors[insight.severity]}`}>
                  {insight.severity.toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{insight.title}</h3>
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-line">{insight.summary}</p>
            {(insight.aiEnhanced || insight.recommendations?.length) ? (
              <div className="flex items-center gap-2 mt-2">
                {insight.aiEnhanced && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-300 shadow-sm">
                    ✨ AI Enhanced
                  </span>
                )}
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {insight.recommendations.length} recommendation{insight.recommendations.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ) : null}
            {metricNames.length > 0 && (
              <div className="text-xs text-gray-500 mb-2">
                Metrics: {metricNames.join(', ')}
              </div>
            )}
            {insight.period && (
              <div className="text-xs text-gray-500">
                Period: {insight.period.start} to {insight.period.end}
              </div>
            )}
          </div>
          {hasEvidence && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs font-medium text-ngm-primary hover:bg-ngm-bg-alt rounded-md transition"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
            </button>
          )}
        </div>

        {isExpanded && hasEvidence && (
          <div className="mt-4 pt-4 border-t border-ngm-border space-y-3">
            {insight.evidence?.values && insight.evidence.values.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Evidence</h4>
                {insight.evidence.values.length >= 2 && (
                  <div className="mb-2">
                    <Sparkline
                      values={insight.evidence.values.map(v => v.value)}
                      isLowerBetter={isLowerBetter}
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-ngm-border">
                        <th className="text-left py-1 px-2 font-semibold text-gray-700">Month</th>
                        <th className="text-right py-1 px-2 font-semibold text-gray-700">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insight.evidence.values.map((v, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-1 px-2 text-gray-600">{v.month}</td>
                          <td className="py-1 px-2 text-right font-medium text-gray-900">{v.value.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {insight.evidence?.changePct !== undefined && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Change: </span>
                <span className={insight.evidence.changePct > 0 ? 'text-green-600' : 'text-red-600'}>
                  {insight.evidence.changePct > 0 ? '+' : ''}{insight.evidence.changePct.toFixed(1)}%
                </span>
              </div>
            )}

            {insight.evidence?.zScore !== undefined && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Z-Score: </span>
                <span className="text-gray-900">{insight.evidence.zScore.toFixed(2)}</span>
              </div>
            )}

            {insight.evidence?.notes && insight.evidence.notes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Notes</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {insight.evidence.notes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {insight.recommendations && insight.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Recommendations</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {insight.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

