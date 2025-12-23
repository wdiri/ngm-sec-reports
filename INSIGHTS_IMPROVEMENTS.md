# Insights Engine Improvements

## 1. Fixed Anomaly Detection Logic

### Problem
The anomaly detection was flagging **all** statistical outliers, even when they represented **good** changes. For example, a decreasing phishing click rate (which is good) was being flagged as an anomaly.

### Solution
Updated `generateAnomalyInsights()` to consider the `isLowerBetter` property from tolerance bands:

- **For "lower is better" metrics** (e.g., phishing click rate, MTTD, MTTR):
  - Only flags anomalies when value is **ABOVE** average (bad)
  - Ignores values below average (good improvements)

- **For "higher is better" metrics** (e.g., security coverage, training completion):
  - Only flags anomalies when value is **BELOW** average (bad)
  - Ignores values above average (good improvements)

### Code Changes
- `src/lib/insights/insightsEngine.ts`: Updated `generateAnomalyInsights()` to accept `tolerances` parameter and check `isLowerBetter`
- Updated anomaly messages to be more contextual (e.g., "Unusual High Value" vs "Unusual Low Value")
- Added recommendations specific to the direction of the anomaly

## 2. AI Enhancement (Optional)

### Overview
Added an optional AI enhancement layer that can:
- Provide more contextual explanations for insights
- Generate better, more specific recommendations
- Create narrative insights that connect multiple metrics

### Implementation
- **File**: `src/lib/insights/aiEnhancement.ts`
- **API**: Uses OpenAI GPT-4o-mini (cost-effective model)
- **Graceful Fallback**: Works without AI if API key is not set

### Features

#### 1. Individual Insight Enhancement
- Enhances critical and warning insights with AI-generated context
- Provides more specific recommendations based on the metric type and context
- Falls back to original insights if AI is unavailable

#### 2. Narrative Insights
- Analyzes multiple insights together
- Identifies patterns and connections between metrics
- Provides strategic recommendations that address multiple issues

### Setup

1. **Add OpenAI API Key** (optional):
```bash
# .env.local
OPENAI_API_KEY=sk-your-key-here
```

2. **Enable AI in UI**:
   - Toggle "AI Enhanced" checkbox on Insights page
   - Preference is saved in localStorage

3. **API Usage**:
```typescript
// Enable AI enhancement
const response = await fetch('/api/insights?ai=true');
```

### Cost Considerations
- Uses `gpt-4o-mini` model (cost-effective)
- Only enhances critical/warning insights (not all insights)
- Max tokens: 300-400 per request
- Estimated cost: ~$0.01-0.02 per insights page load

### When to Use AI
- ✅ When you want more contextual explanations
- ✅ When you need strategic recommendations
- ✅ When analyzing complex multi-metric patterns
- ❌ Not needed for simple statistical insights
- ❌ Can be disabled for cost savings

## 3. Analytics Approach

### Current Implementation
We're using **TypeScript/Node.js** with:
- Statistical methods (z-score, IQR, Pearson correlation)
- Simple forecasting (moving average, linear regression)
- Custom algorithms tailored to security metrics

### Why Not Python?
- **Consistency**: Codebase is TypeScript/Node.js
- **Performance**: Node.js is fast enough for our use case
- **Simplicity**: No need for Python microservice
- **Deployment**: Single language stack is easier to deploy

### When Python Might Be Better
If you need:
- Advanced ML models (neural networks, time series forecasting)
- Heavy data processing (large datasets, complex transformations)
- Specialized libraries (scikit-learn, pandas, numpy)

**Recommendation**: Current approach is sufficient. Consider Python if you need:
- Predictive ML models
- Anomaly detection with autoencoders
- Complex time series forecasting (ARIMA, Prophet)

## 4. Files Modified

1. `src/lib/insights/insightsEngine.ts`
   - Fixed anomaly detection to consider `isLowerBetter`
   - Updated function signature to accept `tolerances`

2. `src/lib/insights/aiEnhancement.ts` (NEW)
   - AI enhancement module
   - Individual insight enhancement
   - Narrative insights generation

3. `src/app/api/insights/route.ts`
   - Added optional AI enhancement
   - Returns both enhanced and standard insights

4. `src/app/insights/page.tsx`
   - Added AI toggle checkbox
   - Handles AI-enhanced response format

5. `src/lib/env.ts`
   - Added `OPENAI_API_KEY` to environment schema

## 5. Testing

### Test Anomaly Detection
1. Create a metric with `isLowerBetter: true` (e.g., phishing click rate)
2. Set values: [12, 11, 10, 9, 8, 7, 6] (decreasing trend)
3. Verify: Should NOT flag the low value (6) as an anomaly
4. Set values: [6, 7, 8, 9, 10, 11, 12] (increasing trend)
5. Verify: SHOULD flag the high value (12) as an anomaly

### Test AI Enhancement
1. Set `OPENAI_API_KEY` in `.env.local`
2. Enable "AI Enhanced" toggle on Insights page
3. Verify insights have enhanced summaries and recommendations
4. Disable toggle and verify standard insights are returned

## 6. Future Enhancements

### Potential AI Features
- [ ] Automatic insight prioritization
- [ ] Root cause analysis suggestions
- [ ] Predictive insights (what might happen next)
- [ ] Natural language queries ("Why did metric X decline?")
- [ ] Automated report generation with narratives

### Potential Advanced Analytics
- [ ] Seasonal decomposition (identify seasonal patterns)
- [ ] Change point detection (when did trends change?)
- [ ] Causal inference (what caused this change?)
- [ ] Multi-metric forecasting (predict multiple metrics together)

## 7. Performance Notes

- **Anomaly Detection**: O(n) per metric, very fast
- **AI Enhancement**: ~1-2 seconds per request (API call)
- **Narrative Insights**: ~2-3 seconds (analyzes multiple insights)
- **Recommendation**: Cache AI-enhanced insights for 1 hour

## 8. Security Considerations

- API key stored in environment variables (never in code)
- AI requests are server-side only (key never exposed to client)
- Graceful fallback if API key is invalid/missing
- Rate limiting recommended for production (OpenAI has limits)

