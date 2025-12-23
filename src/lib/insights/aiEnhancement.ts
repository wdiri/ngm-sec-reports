/**
 * AI Enhancement for Insights
 * 
 * Optional module that uses AI to enhance insights with:
 * - More contextual explanations
 * - Better recommendations
 * - Narrative insights that connect multiple metrics
 * 
 * Requires OpenAI API key to be configured in DashboardConfig.
 * Falls back gracefully if not available.
 */

import { Insight } from '@/types';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import { log } from '@/lib/logging';

/**
 * Get OpenAI client instance
 */
async function getOpenAIClient(): Promise<OpenAI | null> {
  try {
    const config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
      select: { openaiApiKey: true },
    });
    
    // Fallback to environment variable if not in database
    const apiKey = config?.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return null;
    }
    
    // Create OpenAI client with automatic retries and rate limit handling
    return new OpenAI({
      apiKey,
      maxRetries: 2, // Retry up to 2 times on failure
      timeout: 30000, // 30 second timeout
    });
  } catch (error) {
    console.warn('Error creating OpenAI client:', error);
    return null;
  }
}

/**
 * Enhance a single insight with AI-generated context
 */
export async function enhanceInsightWithAI(insight: Insight): Promise<Insight | null> {
  const client = await getOpenAIClient();
  if (!client) {
    return null; // Gracefully skip if no API key
  }

  try {
    const prompt = buildEnhancementPrompt(insight);
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity metrics analyst. Provide concise, actionable insights based on security metrics data. Be specific and avoid generic advice.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return null;
    }

    // Parse AI response and enhance insight
    const enhanced = parseAIEnhancement(insight, aiResponse);
    if (enhanced) {
      log('info', 'ai', `AI enhanced insight: ${insight.title}`, {
        insightId: insight.id,
        type: insight.type,
      });
    }
    return enhanced;
  } catch (error: any) {
    // Handle rate limits and other errors gracefully
    const errorCode = error?.status?.toString() || error?.code || 'UNKNOWN';
    const errorMessage = error?.message || error?.error?.message || 'Unknown error';
    
    if (error?.status === 429) {
      log('warn', 'ai', `Rate limit hit for OpenAI API on insight ${insight.id}`, {
        insightId: insight.id,
        insightTitle: insight.title,
      }, '429', {
        retryAfter: error?.headers?.['retry-after'],
        type: 'rate_limit',
      });
    } else if (error?.status === 401) {
      log('error', 'ai', `OpenAI API authentication failed`, {
        insightId: insight.id,
        error: errorMessage,
      }, '401', {
        type: 'authentication',
      });
    } else if (error?.status === 400) {
      log('error', 'ai', `OpenAI API bad request`, {
        insightId: insight.id,
        error: errorMessage,
      }, '400', {
        type: 'bad_request',
      });
    } else {
      log('error', 'ai', `AI enhancement error for ${insight.id}`, {
        insightId: insight.id,
        insightTitle: insight.title,
        error: errorMessage,
      }, errorCode, {
        type: 'unknown',
        fullError: error,
      });
    }
    
    return null; // Gracefully fail
  }
}

/**
 * Build prompt for AI enhancement
 */
function buildEnhancementPrompt(insight: Insight): string {
  const evidenceText = insight.evidence?.values
    ? `Evidence: ${insight.evidence.values.map(v => `${v.month}: ${v.value}`).join(', ')}`
    : '';
  
  const zScoreText = insight.evidence?.zScore !== undefined
    ? `Z-Score: ${insight.evidence.zScore.toFixed(2)} (${Math.abs(insight.evidence.zScore) > 2 ? 'significant deviation' : 'moderate deviation'})`
    : '';
  
  const changeText = insight.evidence?.changePct !== undefined
    ? `Change: ${insight.evidence.changePct > 0 ? '+' : ''}${insight.evidence.changePct.toFixed(1)}%`
    : '';

  const metricContext = insight.metricKeys?.length 
    ? `Metrics affected: ${insight.metricKeys.join(', ')}`
    : '';

  return `You are a cybersecurity metrics analyst. Analyze this security metric insight and provide:

1. **Enhanced Summary** (2-3 sentences): Provide a more contextual, business-focused explanation that explains:
   - What this insight means in practical terms
   - Why it matters for security posture
   - The business impact or risk implications

2. **Actionable Recommendations** (3-4 specific recommendations): Provide concrete, actionable steps that:
   - Address the root cause or contributing factors
   - Are specific to security operations
   - Include both immediate actions and longer-term improvements
   - Consider the severity level

**Insight Details:**
- Type: ${insight.type}
- Title: ${insight.title}
- Current Summary: ${insight.summary}
- Severity: ${insight.severity || 'info'}
${metricContext}
${evidenceText}
${zScoreText}
${changeText}
${insight.period ? `- Period: ${insight.period.start} to ${insight.period.end}` : ''}

**Response Format (JSON only, no markdown):**
{
  "enhancedSummary": "Your enhanced 2-3 sentence explanation here",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ]
}`;
}

/**
 * Parse AI response and merge with insight
 */
function parseAIEnhancement(insight: Insight, aiResponse: string): Insight {
  try {
    // Try to extract JSON from response (handle code blocks)
    let jsonText = aiResponse;
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const enhancedSummary = parsed.enhancedSummary || parsed.summary || insight.summary;
      const recommendations = parsed.recommendations || insight.recommendations || [];
      
      return {
        ...insight,
        summary: enhancedSummary,
        recommendations: recommendations.length > 0 ? recommendations : insight.recommendations || [],
        aiEnhanced: true, // Mark as AI-enhanced
      };
    }
  } catch (error) {
    console.warn('Failed to parse AI response:', error);
  }

  // Fallback: try to extract summary and recommendations from text
  try {
    const lines = aiResponse.split('\n').filter(l => l.trim());
    const summaryMatch = aiResponse.match(/summary[":\s]+"([^"]+)"/i) || 
                        aiResponse.match(/enhancedSummary[":\s]+"([^"]+)"/i);
    const recommendationsMatch = aiResponse.match(/recommendations[":\s]+\[([^\]]+)\]/i);
    
    if (summaryMatch || recommendationsMatch) {
      return {
        ...insight,
        summary: summaryMatch ? summaryMatch[1] : insight.summary,
        recommendations: recommendationsMatch 
          ? recommendationsMatch[1].split(',').map((r: string) => r.trim().replace(/["']/g, ''))
          : insight.recommendations || [],
        aiEnhanced: true, // Mark as AI-enhanced
      };
    }
  } catch (error) {
    console.warn('Failed to parse AI response as text:', error);
  }

  // Final fallback: add AI response as additional context in notes
  return {
    ...insight,
    aiEnhanced: true, // Mark as AI-enhanced even if parsing failed
    evidence: {
      ...insight.evidence,
      notes: [
        ...(insight.evidence?.notes || []),
        `AI Analysis: ${aiResponse.substring(0, 300)}`,
      ],
    },
  };
}

/**
 * Generate narrative insights that connect multiple metrics
 */
export async function generateNarrativeInsights(insights: Insight[]): Promise<Insight[]> {
  const client = await getOpenAIClient();
  if (!client || insights.length < 3) {
    return [];
  }

  try {
    // Group insights by severity and type
    const criticalInsights = insights.filter(i => i.severity === 'critical');
    const warningInsights = insights.filter(i => i.severity === 'warning');
    
    if (criticalInsights.length === 0 && warningInsights.length === 0) {
      return [];
    }

    const prompt = `You are a cybersecurity metrics analyst. Analyze these security metric insights and identify:

1. **Patterns or Connections**: How do these metrics relate to each other? Are there common root causes?
2. **Strategic Context**: What do these insights collectively tell us about the security posture?
3. **Holistic Recommendations**: What actions would address multiple issues simultaneously?

**Insights to Analyze:**
${[...criticalInsights, ...warningInsights].slice(0, 5).map(i => 
  `- ${i.title} (${i.severity}): ${i.summary}${i.metricKeys ? ` [Metrics: ${i.metricKeys.join(', ')}]` : ''}`
).join('\n')}

**Response Format (JSON array only, no markdown):**
[
  {
    "title": "Clear, descriptive title connecting the insights",
    "summary": "2-3 sentence explanation of how these metrics connect and what they indicate about overall security posture",
    "recommendations": [
      "Strategic recommendation that addresses multiple issues",
      "Another strategic recommendation"
    ]
  }
]

Provide 1-2 narrative insights that synthesize these findings into actionable strategic guidance.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity metrics analyst. Identify patterns and connections between security metrics.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return [];
    }

    // Parse narrative insights
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const narratives = JSON.parse(jsonMatch[0]);
        return narratives.map((n: any, idx: number) => ({
          id: `narrative-${Date.now()}-${idx}`,
          type: 'trend' as const,
          title: n.title,
          summary: n.summary,
          severity: 'info' as const,
          recommendations: n.recommendations || [],
          aiEnhanced: true, // Narrative insights are always AI-generated
        }));
      }
    } catch (error) {
      console.warn('Failed to parse narrative insights:', error);
    }

    return [];
  } catch (error: any) {
    const errorCode = error?.status?.toString() || error?.code || 'UNKNOWN';
    const errorMessage = error?.message || error?.error?.message || 'Unknown error';
    
    if (error?.status === 429) {
      log('warn', 'ai', 'Rate limit hit while generating narrative insights', {
        error: errorMessage,
      }, '429', {
        type: 'rate_limit',
        retryAfter: error?.headers?.['retry-after'],
      });
    } else {
      log('error', 'ai', 'Narrative insights generation failed', {
        error: errorMessage,
      }, errorCode, {
        type: 'narrative_generation',
      });
    }
    return [];
  }
}

/**
 * Check if AI enhancement is available
 */
export async function isAIAvailable(): Promise<boolean> {
  const client = await getOpenAIClient();
  return !!client;
}

