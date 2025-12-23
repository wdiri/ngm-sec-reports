'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Insight, InsightType } from '@/types';
import { InsightGridCard } from '@/components/InsightGridCard';
import { InsightModal } from '@/components/InsightModal';
import { InsightsFilters } from '@/components/InsightsFilters';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [timeRange, setTimeRange] = useState<number | null>(3);
  const allMetrics = Array.from({ length: 11 }, (_, i) => i + 1);
  const allInsightTypes: InsightType[] = ['trend', 'anomaly', 'milestone', 'comparison', 'forecast', 'correlation'];
  const [selectedMetrics, setSelectedMetrics] = useState<number[]>(allMetrics);
  const [selectedTypes, setSelectedTypes] = useState<InsightType[]>(allInsightTypes);
  const [showAll, setShowAll] = useState(false);
  const [mostRecentPeriod, setMostRecentPeriod] = useState<(ReportingPeriod & { metrics: Metric[] }) | null>(null);
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [aiEnabled, setAiEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('enableAIInsights') === 'true';
    }
    return false;
  });
  const [aiAvailable, setAiAvailable] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if AI is available
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setAiAvailable(!!configData?.openaiApiKey);
      
      // Fetch most recent period for key takeaways
      const periodsRes = await fetch('/api/periods');
      const periodsData = await periodsRes.json() as (ReportingPeriod & { metrics: Metric[] })[];
      const finalisedPeriods = periodsData.filter(p => p.isFinalised);
      if (finalisedPeriods.length > 0) {
        const sorted = finalisedPeriods.sort((a, b) => {
          const aDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
          const bDate = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
          return bDate.getTime() - aDate.getTime();
        });
        setMostRecentPeriod(sorted[0]);
      }

      // Fetch tolerances
      const tolerancesRes = await fetch('/api/tolerances');
      const tolerancesData = await tolerancesRes.json();
      setTolerances(tolerancesData);

      // Only fetch insights if filters are properly configured
      if (timeRange === null || selectedMetrics.length === 0 || selectedTypes.length === 0) {
        setInsights([]);
        setIsLoading(false);
        setIsAiProcessing(false);
        return;
      }

      // Fetch insights
      const params = new URLSearchParams();
      if (timeRange !== null && timeRange > 0) {
        params.append('timeRange', timeRange.toString());
      }
      if (selectedMetrics.length > 0) {
        params.append('metrics', selectedMetrics.join(','));
      }
      if (selectedTypes.length > 0) {
        params.append('types', selectedTypes.join(','));
      }

      // Check if AI is enabled (optional enhancement)
      if (aiEnabled && aiAvailable) {
        params.append('ai', 'true');
        setIsAiProcessing(true);
        toast.loading('Enhancing insights with AI...', { id: 'ai-processing' });
      }

      const insightsRes = await fetch(`/api/insights?${params.toString()}`);
      if (!insightsRes.ok) throw new Error('Failed to fetch insights');
      const insightsData = await insightsRes.json();
      
      // Handle both old format (array) and new format (object with insights property)
      const insightsArray = Array.isArray(insightsData) ? insightsData : insightsData.insights || [];
      setInsights(insightsArray);
      
      // Show AI stats if available
      if (insightsData.aiStats && aiEnabled) {
        toast.dismiss('ai-processing');
        const { enhanced, failed, total, rateLimited } = insightsData.aiStats;
        if (rateLimited) {
          toast.error('AI rate limit reached (429). Only some insights were enhanced. Please wait a moment and try again.', { duration: 6000 });
        } else if (enhanced > 0) {
          toast.success(`✨ AI enhanced ${enhanced} insight${enhanced !== 1 ? 's' : ''}`, { duration: 4000 });
        } else if (failed > 0) {
          toast.error(`AI enhancement failed. Check logs in Settings for error codes.`, { duration: 5000 });
        } else {
          toast.success('AI enhancement completed', { duration: 3000 });
        }
      } else if (aiEnabled && !aiAvailable) {
        toast.dismiss('ai-processing');
        toast.error('AI not available. Please configure your OpenAI API key in Settings.', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      toast.dismiss('ai-processing');
      toast.error('Failed to load insights');
    } finally {
      setIsLoading(false);
      setIsAiProcessing(false);
    }
  }, [timeRange, selectedMetrics, selectedTypes, aiEnabled, aiAvailable]);

  useEffect(() => {
    loadData();
  }, [loadData, aiEnabled]);

  const handleToggleAI = (enabled: boolean) => {
    setAiEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableAIInsights', enabled.toString());
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (timeRange !== null && timeRange > 0) {
        params.append('timeRange', timeRange.toString());
      }
      if (selectedMetrics.length > 0) {
        params.append('metrics', selectedMetrics.join(','));
      }
      if (selectedTypes.length > 0) {
        params.append('types', selectedTypes.join(','));
      }

      const response = await fetch(`/api/export/insights-pdf?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insights-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Get top insights, sorted by severity, limited to 12 if showAll is false
  const displayedInsights = useMemo(() => {
    // Sort all insights by severity (critical > warning > info)
    const sorted = [...insights].sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const aSeverity = severityOrder[a.severity || 'info'] ?? 2;
      const bSeverity = severityOrder[b.severity || 'info'] ?? 2;
      return aSeverity - bSeverity;
    });

    // If showAll is false, limit to top 12
    return showAll ? sorted : sorted.slice(0, 12);
  }, [insights, showAll]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Loading insights...</div>
          {isAiProcessing && (
            <div className="text-sm text-purple-600 mt-2">
              ✨ Enhancing with AI (this may take a moment)...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ngm-bg pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6 grid gap-6 lg:grid-cols-4 lg:items-stretch">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="flex flex-col gap-2 mb-4">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                aiEnabled 
                  ? 'border-purple-400 bg-purple-50 shadow-sm' 
                  : 'border-ngm-border bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => handleToggleAI(e.target.checked)}
                  className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
                />
                <span className={`text-sm font-medium ${aiEnabled ? 'text-purple-700' : 'text-gray-700'}`}>
                  ✨ AI Enhanced
                </span>
              </label>
              {aiEnabled && !aiAvailable && (
                <span className="text-xs text-amber-600 px-2 font-medium bg-amber-50 rounded px-3 py-1">
                  ⚠ Configure API key in Settings
                </span>
              )}
              {aiEnabled && aiAvailable && (
                <span className="text-xs text-green-700 px-2 font-medium bg-green-50 rounded px-3 py-1">
                  ✓ Active
                </span>
              )}
              {isAiProcessing && (
                <span className="text-xs text-purple-600 px-2 font-medium bg-purple-50 rounded px-3 py-1 animate-pulse">
                  Processing...
                </span>
              )}
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
              >
                Export PDF
              </button>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                showAll
                  ? 'border-blue-400 bg-blue-50 shadow-sm' 
                  : 'border-ngm-border bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                  className="rounded border-ngm-border text-ngm-primary focus:ring-ngm-accent"
                />
                <span className={`text-sm font-medium ${showAll ? 'text-blue-700' : 'text-gray-700'}`}>
                  Show All
                </span>
              </label>
            </div>
            <div className="flex-grow min-h-0">
              <InsightsFilters
                timeRange={timeRange}
                selectedMetrics={selectedMetrics}
                selectedTypes={selectedTypes}
                onTimeRangeChange={setTimeRange}
                onMetricsChange={setSelectedMetrics}
                onTypesChange={setSelectedTypes}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {displayedInsights.length > 0 ? (
              <div className="bg-white rounded-lg border border-ngm-border p-6 shadow-sm h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Key Findings</h2>
                  {!showAll && insights.length > 12 && (
                    <span className="text-sm text-gray-500">
                      Showing top 12 of {insights.length} insights
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedInsights.map(insight => (
                    <InsightGridCard
                      key={insight.id}
                      insight={insight}
                      onClick={() => setSelectedInsight(insight)}
                    />
                  ))}
                </div>
              </div>
            ) : !isLoading && (
              <div className="bg-white rounded-lg border border-dashed border-ngm-border p-8 text-center text-gray-500 shadow-sm">
                {timeRange === null || selectedMetrics.length === 0 || selectedTypes.length === 0
                  ? 'Select filters to view insights. Choose a time range, at least one metric, and at least one insight type.'
                  : 'No insights found for the selected filters. Try adjusting your filters or ensure you have enough historical data.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insight Modal */}
      {selectedInsight && (
        <InsightModal
          insight={selectedInsight}
          isOpen={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
          tolerances={tolerances.map(t => ({ metricNumber: t.metricNumber, isLowerBetter: t.isLowerBetter }))}
        />
      )}
    </div>
  );
}

