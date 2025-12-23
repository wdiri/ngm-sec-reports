'use client';

import { Insight } from '@/types';
import { getMetricName } from '@/lib/domain/metrics';

interface InsightGridCardProps {
  insight: Insight;
  onClick: () => void;
}

export function InsightGridCard({ insight, onClick }: InsightGridCardProps) {
  const severityColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  const typeColors = {
    trend: 'bg-purple-100 text-purple-700',
    anomaly: 'bg-orange-100 text-orange-700',
    milestone: 'bg-green-100 text-green-700',
    comparison: 'bg-blue-100 text-blue-700',
    forecast: 'bg-indigo-100 text-indigo-700',
    correlation: 'bg-pink-100 text-pink-700',
  };

  const metricName = insight.metricKeys?.[0] 
    ? getMetricName(insight.metricKeys[0])
    : 'Unknown Metric';

  // Truncate summary for grid display
  const truncatedSummary = insight.summary.length > 120 
    ? insight.summary.substring(0, 120) + '...'
    : insight.summary;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border-2 border-ngm-border p-4 shadow-sm hover:shadow-md hover:border-ngm-accent transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[insight.type] || 'bg-gray-100 text-gray-700'}`}>
          {insight.type.toUpperCase()}
        </span>
        {insight.severity && (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${severityColors[insight.severity]}`}>
            {insight.severity.toUpperCase()}
          </span>
        )}
      </div>
      
      <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-ngm-primary transition-colors">
        {insight.title}
      </h3>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
        {truncatedSummary}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {metricName}
        </div>
        {insight.aiEnhanced && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
            ✨ AI
          </span>
        )}
      </div>
    </button>
  );
}

