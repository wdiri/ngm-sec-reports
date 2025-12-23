'use client';

import { Insight } from '@/types';
import { getMetricName } from '@/lib/domain/metrics';
import { Sparkline } from './Sparkline';

interface InsightModalProps {
  insight: Insight;
  isOpen: boolean;
  onClose: () => void;
  tolerances?: Array<{ metricNumber: number; isLowerBetter: boolean }>;
}

export function InsightModal({ insight, isOpen, onClose, tolerances }: InsightModalProps) {
  if (!isOpen) return null;

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

  const metricNames = insight.metricKeys?.map(mn => getMetricName(mn)).filter(Boolean) || [];
  const isLowerBetter = insight.metricKeys?.[0] 
    ? tolerances?.find(t => t.metricNumber === insight.metricKeys![0])?.isLowerBetter || false
    : false;

  const hasEvidence = insight.evidence && (
    insight.evidence.values ||
    insight.evidence.changePct !== undefined ||
    insight.evidence.zScore !== undefined ||
    insight.evidence.notes
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ngm-border px-6 py-4 flex items-start justify-between">
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
              {insight.aiEnhanced && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-300">
                  ✨ AI Enhanced
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{insight.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{insight.summary}</p>
          </div>

          {/* Metrics */}
          {metricNames.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Metrics</h3>
              <div className="text-sm text-gray-700">
                {metricNames.join(', ')}
              </div>
            </div>
          )}

          {/* Period */}
          {insight.period && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Period</h3>
              <div className="text-sm text-gray-700">
                {insight.period.start} to {insight.period.end}
              </div>
            </div>
          )}

          {/* Evidence */}
          {hasEvidence && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence</h3>
              
              {insight.evidence?.values && insight.evidence.values.length > 0 && (
                <div className="mb-4">
                  {insight.evidence.values.length >= 2 && (
                    <div className="mb-3">
                      <Sparkline
                        values={insight.evidence.values.map(v => v.value)}
                        isLowerBetter={isLowerBetter}
                      />
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-ngm-border rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-ngm-border">Month</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700 border-b border-ngm-border">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insight.evidence.values.map((v, idx) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-2 px-3 text-gray-600">{v.month}</td>
                            <td className="py-2 px-3 text-right font-medium text-gray-900">{v.value.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {insight.evidence?.changePct !== undefined && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">Change: </span>
                  <span className={`text-sm font-semibold ${insight.evidence.changePct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insight.evidence.changePct > 0 ? '+' : ''}{insight.evidence.changePct.toFixed(1)}%
                  </span>
                </div>
              )}

              {insight.evidence?.zScore !== undefined && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">Z-Score: </span>
                  <span className="text-sm font-semibold text-gray-900">{insight.evidence.zScore.toFixed(2)}</span>
                </div>
              )}

              {insight.evidence?.notes && insight.evidence.notes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {insight.evidence.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {insight.recommendations && insight.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommendations</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                {insight.recommendations.map((rec, idx) => (
                  <li key={idx} className="pl-2">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

