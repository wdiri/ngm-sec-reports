'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  values: number[];
  isLowerBetter?: boolean;
}

export function Sparkline({ values, isLowerBetter = false }: SparklineProps) {
  if (values.length < 2) {
    return <span className="text-gray-400">-</span>;
  }

  const data = values.map((value, index) => ({
    index,
    value,
  }));

  const color = isLowerBetter
    ? values[values.length - 1] < values[0]
      ? '#10b981' // green
      : '#ef4444' // red
    : values[values.length - 1] > values[0]
    ? '#10b981' // green
    : '#ef4444'; // red

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

