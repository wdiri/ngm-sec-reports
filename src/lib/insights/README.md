# Insights Engine

The insights engine analyzes historical monthly security metrics to generate actionable insights including trends, anomalies, milestones, comparisons, forecasts, and correlations.

## Architecture

The insights engine consists of:

1. **Data Preparation**: `prepareMetricTimeSeries()` - Extracts and normalizes time series data from periods
2. **Insight Generators**: Individual functions for each insight type
3. **Main Function**: `generateInsights()` - Orchestrates all generators and applies filters

## Adding a New Insight Type

To add a new insight type, follow these steps:

### 1. Update Type Definitions

Add the new type to `InsightType` in `src/types/index.ts`:

```typescript
export type InsightType = "trend" | "anomaly" | "milestone" | "comparison" | "forecast" | "correlation" | "your-new-type";
```

### 2. Create Generator Function

Add a new generator function in `src/lib/insights/insightsEngine.ts`:

```typescript
function generateYourNewInsightType(
  periods: (ReportingPeriod & { metrics: Metric[] })[],
  options: InsightsOptions
): Insight[] {
  const insights: Insight[] = [];
  
  // Your analysis logic here
  // Example:
  for (const metricNumber of metricNumbers) {
    const series = prepareMetricTimeSeries(periods, metricNumber);
    // Analyze series and create insights
    insights.push({
      id: generateInsightId('your-new-type', metricNumber),
      type: 'your-new-type',
      title: 'Your Insight Title',
      summary: 'Your insight summary',
      severity: 'info',
      metricKeys: [metricNumber],
      // ... other fields
    });
  }
  
  return insights;
}
```

### 3. Integrate into Main Function

Add your generator to the `generateInsights()` function:

```typescript
if (requestedTypes.includes('your-new-type')) {
  allInsights.push(...generateYourNewInsightType(filteredPeriods, options));
}
```

### 4. Update UI Components

- Add the new type to `INSIGHT_TYPES` in `src/components/InsightsFilters.tsx`
- Update any type-specific styling in `src/components/InsightCard.tsx` if needed

### 5. Update Documentation

Add a description of your new insight type to this README.

## Insight Generation Rules

### Trend Insights
- Month-over-month changes > 5% trigger insights
- Rolling averages (3/6/12 month) compared to current value
- Top improving/degrading metrics ranked by % change

### Anomaly Insights
- Z-score method: |z| > 2 (warning), |z| > 3 (critical)
- IQR method: Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
- Requires minimum 3-6 months of data

### Milestone Insights
- New highs/lows in last 12 months
- Improvement/decline streaks of 4+ months
- First time crossing tolerance thresholds (green/red zones)

### Comparison Insights
- Month-over-month: > 5% change
- Year-over-year: > 10% change (if available)
- Current vs rolling averages

### Forecast Insights
- Moving average: Average of last 3 months
- Linear regression: For 6+ months of data
- Always includes "low confidence" note
- Requires minimum 3 months of data

### Correlation Insights
- Pearson correlation coefficient
- Only surfaces if |r| > 0.7
- Requires 12+ months of aligned data
- Includes "correlation ≠ causation" caveat

## Edge Case Handling

- **< 3 months of data**: Limited insights, forecast disabled
- **Missing months**: Gaps are skipped, no interpolation
- **Null/undefined values**: Filtered out before analysis
- **Non-numeric values**: Validated and skipped
- **Insufficient data for specific insight**: Generator returns empty array

## Performance Considerations

- Insights are computed server-side to avoid client performance issues
- Time series preparation is memoized where possible
- Filters are applied early to reduce computation
- Large datasets (> 24 months) may take 1-2 seconds to process

## Testing

Unit tests are located in `insightsEngine.test.ts`. Run with:

```bash
node --test src/lib/insights/insightsEngine.test.ts
```

Tests cover:
- Trend detection
- Anomaly detection (z-score, IQR)
- Correlation calculation
- Edge cases (insufficient data, null values)
- Time series preparation

## Data Requirements

- **Minimum**: 1 finalised period (for basic insights)
- **Recommended**: 6+ finalised periods (for meaningful trends)
- **Optimal**: 12+ finalised periods (for correlations, YoY comparisons)

## Statistical Methods

- **Z-Score**: `(value - mean) / stdDev`
- **IQR**: Interquartile range method for outlier detection
- **Pearson Correlation**: Standard correlation coefficient
- **Moving Average**: Simple average of last N values
- **Linear Regression**: Least squares method for trend forecasting

