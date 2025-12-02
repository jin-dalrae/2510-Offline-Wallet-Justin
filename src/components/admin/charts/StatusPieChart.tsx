import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusPieChartProps {
  data: {
    pending: number;
    settled: number;
    failed: number;
  };
}

const COLORS = {
  pending: '#f59e0b',
  settled: '#10b981',
  failed: '#ef4444',
};

export function StatusPieChart({ data }: StatusPieChartProps) {
  const chartData = [
    { name: 'Pending', value: data.pending, color: COLORS.pending },
    { name: 'Settled', value: data.settled, color: COLORS.settled },
    { name: 'Failed', value: data.failed, color: COLORS.failed },
  ].filter((item) => item.value > 0); // Only show non-zero values

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No transaction data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
