/**
 * Unit tests for insights engine
 * 
 * These tests verify the statistical calculations and edge case handling
 * in the insights engine. Run with: node --test insightsEngine.test.ts
 */

import { generateInsights, prepareMetricTimeSeries } from './insightsEngine';
import { ReportingPeriod, Metric, ToleranceBand } from '@prisma/client';

// Mock data helpers
function createPeriod(
  label: string,
  startDate: Date,
  metrics: Array<{ metricNumber: number; value: number }>
): ReportingPeriod & { metrics: Metric[] } {
  return {
    id: `period-${label}`,
    label,
    startDate,
    endDate: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0),
    isFinalised: true,
    finalisedAt: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0),
    createdAt: startDate,
    updatedAt: startDate,
    metrics: metrics.map(m => ({
      id: `metric-${label}-${m.metricNumber}`,
      periodId: `period-${label}`,
      metricNumber: m.metricNumber,
      name: `Metric ${m.metricNumber}`,
      description: `Description ${m.metricNumber}`,
      value: m.value,
      unit: '%',
      isNA: false,
      hidden: false,
      naReason: null,
      insight: null,
      createdAt: startDate,
      updatedAt: startDate,
    })),
  };
}

function createTolerance(metricNumber: number, isLowerBetter = false): ToleranceBand {
  return {
    id: `tolerance-${metricNumber}`,
    metricNumber,
    greenMin: 90,
    greenMax: 100,
    greenOperator: 'range',
    amberMin: 75,
    amberMax: 89.9,
    amberOperator: 'range',
    redMin: 0,
    redMax: 74.9,
    redOperator: 'range',
    isLowerBetter,
    flatTolerance: 1.0,
    updatedAt: new Date(),
  };
}

// Test trend detection
function testTrendDetection() {
  console.log('Testing trend detection...');
  
  const periods = [
    createPeriod('2024-01', new Date(2024, 0, 1), [{ metricNumber: 1, value: 80 }]),
    createPeriod('2024-02', new Date(2024, 1, 1), [{ metricNumber: 1, value: 85 }]),
    createPeriod('2024-03', new Date(2024, 2, 1), [{ metricNumber: 1, value: 90 }]),
  ];

  const tolerances = [createTolerance(1)];

  const insights = generateInsights(periods, tolerances, {
    types: ['trend'],
    metricNumbers: [1],
  });

  const trendInsights = insights.filter(i => i.type === 'trend');
  if (trendInsights.length === 0) {
    console.error('❌ Expected trend insights, got none');
    return false;
  }

  console.log('✅ Trend detection test passed');
  return true;
}

// Test anomaly detection (z-score)
function testAnomalyDetection() {
  console.log('Testing anomaly detection...');
  
  // Create data with an outlier
  const values = [80, 82, 81, 83, 79, 120]; // Last value is an outlier
  const periods = values.map((value, index) =>
    createPeriod(
      `2024-${String(index + 1).padStart(2, '0')}`,
      new Date(2024, index, 1),
      [{ metricNumber: 1, value }]
    )
  );

  const tolerances = [createTolerance(1)];

  const insights = generateInsights(periods, tolerances, {
    types: ['anomaly'],
    metricNumbers: [1],
  });

  const anomalyInsights = insights.filter(i => i.type === 'anomaly');
  if (anomalyInsights.length === 0) {
    console.error('❌ Expected anomaly insights, got none');
    return false;
  }

  const hasOutlier = anomalyInsights.some(i => 
    i.evidence?.zScore !== undefined && Math.abs(i.evidence.zScore) > 2
  );

  if (!hasOutlier) {
    console.error('❌ Expected outlier detection, got none');
    return false;
  }

  console.log('✅ Anomaly detection test passed');
  return true;
}

// Test correlation calculation
function testCorrelation() {
  console.log('Testing correlation calculation...');
  
  // Create two metrics with strong positive correlation
  const metric1Values = [80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102];
  const metric2Values = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]; // Strongly correlated

  const periods = metric1Values.map((_, index) =>
    createPeriod(
      `2024-${String(index + 1).padStart(2, '0')}`,
      new Date(2024, index, 1),
      [
        { metricNumber: 1, value: metric1Values[index] },
        { metricNumber: 2, value: metric2Values[index] },
      ]
    )
  );

  const tolerances = [createTolerance(1), createTolerance(2)];

  const insights = generateInsights(periods, tolerances, {
    types: ['correlation'],
    metricNumbers: [1, 2],
  });

  const correlationInsights = insights.filter(i => i.type === 'correlation');
  if (correlationInsights.length === 0) {
    console.error('❌ Expected correlation insights, got none');
    return false;
  }

  console.log('✅ Correlation test passed');
  return true;
}

// Test edge cases
function testEdgeCases() {
  console.log('Testing edge cases...');
  
  // Test with insufficient data (< 3 months)
  const fewPeriods = [
    createPeriod('2024-01', new Date(2024, 0, 1), [{ metricNumber: 1, value: 80 }]),
    createPeriod('2024-02', new Date(2024, 1, 1), [{ metricNumber: 1, value: 85 }]),
  ];

  const tolerances = [createTolerance(1)];

  const insights = generateInsights(fewPeriods, tolerances, {
    types: ['forecast'],
    metricNumbers: [1],
  });

  // Should handle gracefully without errors
  const forecastInsights = insights.filter(i => i.type === 'forecast');
  // Forecast should not be generated with < 3 months
  if (forecastInsights.length > 0) {
    console.error('❌ Expected no forecast with < 3 months, got some');
    return false;
  }

  // Test with null values
  const periodWithNull = createPeriod('2024-01', new Date(2024, 0, 1), [
    { metricNumber: 1, value: 80 },
  ]);
  periodWithNull.metrics[0].value = null;

  const insightsWithNull = generateInsights([periodWithNull], tolerances, {
    types: ['trend'],
    metricNumbers: [1],
  });

  // Should handle null values gracefully
  console.log('✅ Edge cases test passed');
  return true;
}

// Test time series preparation
function testTimeSeriesPreparation() {
  console.log('Testing time series preparation...');
  
  const periods = [
    createPeriod('2024-01', new Date(2024, 0, 1), [{ metricNumber: 1, value: 80 }]),
    createPeriod('2024-02', new Date(2024, 1, 1), [{ metricNumber: 1, value: 85 }]),
    createPeriod('2024-03', new Date(2024, 2, 1), [{ metricNumber: 1, value: 90 }]),
  ];

  const series = prepareMetricTimeSeries(periods, 1);
  
  if (series.length !== 3) {
    console.error(`❌ Expected 3 data points, got ${series.length}`);
    return false;
  }

  if (series[0].month !== '2024-01' || series[0].value !== 80) {
    console.error('❌ Time series data incorrect');
    return false;
  }

  console.log('✅ Time series preparation test passed');
  return true;
}

// Run all tests
function runTests() {
  console.log('Running insights engine tests...\n');
  
  const tests = [
    testTimeSeriesPreparation,
    testTrendDetection,
    testAnomalyDetection,
    testCorrelation,
    testEdgeCases,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test failed with error:`, error);
      failed++;
    }
    console.log('');
  }

  console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Export for use in test runners
export { runTests };

// Run if executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

