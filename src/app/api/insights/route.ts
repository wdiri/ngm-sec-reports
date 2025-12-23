import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateInsights } from '@/lib/insights/insightsEngine';
import { enhanceInsightWithAI, generateNarrativeInsights, isAIAvailable } from '@/lib/insights/aiEnhancement';
import { InsightType } from '@/types';
import { log } from '@/lib/logging';
import { get, set, CacheKeys } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = parseInt(searchParams.get('timeRange') || '12');
    const metricsParam = searchParams.get('metrics');
    const typesParam = searchParams.get('types');

    const metricNumbers = metricsParam ? metricsParam.split(',').map(Number).filter(n => !isNaN(n)) : undefined;
    const types = typesParam ? (typesParam.split(',') as InsightType[]) : undefined;
    const enableAI = searchParams.get('ai') === 'true';

    // Check cache (only for non-AI insights, as AI insights are dynamic)
    if (!enableAI) {
      const cacheKey = CacheKeys.insights(timeRange, metricsParam || undefined, typesParam || undefined);
      const cached = await get<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Fetch finalised periods with metrics
    // Fetch enough periods to cover the time range (add buffer for safety)
    const periods = await prisma.reportingPeriod.findMany({
      where: { isFinalised: true },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
      take: timeRange > 0 ? Math.max(timeRange + 2, 24) : 100, // Fetch enough to cover time range + buffer
    });

    // Fetch tolerances for milestone insights (use cache)
    const tolerancesCacheKey = CacheKeys.toleranceBands;
    let tolerances = await get<any[]>(tolerancesCacheKey);
    if (!tolerances) {
      tolerances = await prisma.toleranceBand.findMany();
      await set(tolerancesCacheKey, tolerances, 3600);
    }

    let insights = generateInsights(periods, tolerances, {
      timeRange: timeRange > 0 ? timeRange : undefined,
      metricNumbers,
      types,
    });

    // Optionally enhance with AI if available
    const aiAvailable = await isAIAvailable();
    let aiEnhancedCount = 0;
    let aiFailedCount = 0;
    let rateLimitHit = false;
    
    if (enableAI && aiAvailable) {
      try {
        log('info', 'ai', `Starting AI enhancement for ${insights.length} insights`);
        
        // Enhance only the most important insights to avoid rate limits
        // Prioritize critical/warning, limit total to 3-5 insights max
        const criticalAndWarning = insights.filter(i => i.severity === 'critical' || i.severity === 'warning');
        const otherInsights = insights.filter(i => i.severity !== 'critical' && i.severity !== 'warning');
        
        // Helper to add delay between API calls with exponential backoff
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Only enhance top 3 critical/warning insights to avoid rate limits
        const insightsToEnhance = [...criticalAndWarning.slice(0, 3), ...otherInsights.slice(0, 2)].slice(0, 5);
        
        const enhancedInsights = [];
        for (let i = 0; i < insightsToEnhance.length; i++) {
          const insight = insightsToEnhance[i];
          const enhanced = await enhanceInsightWithAI(insight);
          
          if (enhanced) {
            enhancedInsights.push({ original: insight, enhanced });
            aiEnhancedCount++;
          } else {
            aiFailedCount++;
            // Rate limit detection is handled in enhanceInsightWithAI
          }
          
          // Add delay between calls (200ms to be safer with rate limits)
          if (i < insightsToEnhance.length - 1) {
            await delay(200);
          }
        }
        
        // Replace original insights with enhanced versions
        enhancedInsights.forEach(({ original, enhanced }) => {
          const originalIdx = insights.findIndex(i => i.id === original.id);
          if (originalIdx !== -1 && enhanced) {
            insights[originalIdx] = enhanced;
          }
        });
        

        // Only generate narrative insights if we didn't hit rate limits
        if (!rateLimitHit && aiEnhancedCount > 0) {
          try {
            const narrativeInsights = await generateNarrativeInsights(insights);
            insights = [...insights, ...narrativeInsights];
            aiEnhancedCount += narrativeInsights.length;
          } catch (error) {
            console.warn('Narrative insights generation failed:', error);
          }
        }
        
        log('info', 'ai', `AI enhancement complete: ${aiEnhancedCount} enhanced, ${aiFailedCount} failed${rateLimitHit ? ' (rate limited)' : ''}`, {
          enhanced: aiEnhancedCount,
          failed: aiFailedCount,
          rateLimited: rateLimitHit,
        });
      } catch (error: any) {
        log('error', 'ai', 'AI enhancement failed, returning standard insights', {
          error: error?.message || 'Unknown error',
        }, error?.status?.toString() || 'UNKNOWN');
        rateLimitHit = true;
        // Continue with non-enhanced insights
      }
    }

    const response = {
      insights,
      aiEnhanced: enableAI && aiAvailable,
      aiStats: enableAI && aiAvailable ? {
        enhanced: aiEnhancedCount,
        failed: aiFailedCount,
        total: insights.length,
        rateLimited: rateLimitHit,
      } : undefined,
    };

    // Cache non-AI insights for 5 minutes
    if (!enableAI) {
      const cacheKey = CacheKeys.insights(timeRange, metricsParam || undefined, typesParam || undefined);
      await set(cacheKey, response, 300); // 5 minutes TTL
    }

    return NextResponse.json(response);
  } catch (error: any) {
    log('error', 'insights', 'Error generating insights', {
      error: error?.message || 'Unknown error',
    }, '500');
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

