import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export const TrendChart: React.FC<{
  data: Record<string, string | number>[];
  xKey: string;
  series: TrendSeries[];
  height?: number;
}> = ({ data, xKey, series, height = 260 }) => (
  <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F1F5F9', fontSize: 12 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default TrendChart;
