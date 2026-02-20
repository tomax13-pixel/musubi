'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AttendanceStat } from '@/lib/actions/analytics.actions';

interface Props {
  data: AttendanceStat[];
}

export function AttendanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">
        データがありません
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
        <XAxis
          dataKey="eventName"
          tick={{ fontSize: 11, fill: '#737373' }}
          tickLine={false}
          axisLine={false}
          interval={0}
          tickFormatter={(v: string) =>
            v.length > 8 ? v.slice(0, 7) + '…' : v
          }
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#737373' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, '出席率']}
          contentStyle={{
            fontSize: 12,
            border: '1px solid #e5e5e5',
            borderRadius: 6,
            color: '#171717',
          }}
          cursor={{ fill: '#f5f5f5' }}
        />
        <Bar dataKey="attendanceRate" fill="#333333" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
