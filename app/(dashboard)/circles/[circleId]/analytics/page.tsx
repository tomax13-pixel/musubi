'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircleAnalytics } from '@/lib/actions/analytics.actions';
import type { CircleAnalyticsData } from '@/lib/actions/analytics.actions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// =====================
// カスタム Tooltip（モノトーン）
// =====================

function AttendanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { attendedCount: number; totalMembers: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const value = entry.value;
  const inner = entry.payload;
  return (
    <div className="rounded border border-neutral-200 bg-white px-3 py-2 text-[12px] shadow-sm">
      <p className="font-medium text-neutral-800">{label}</p>
      <p className="mt-0.5 text-neutral-500">
        出席率: <span className="font-semibold text-neutral-800">{value}%</span>
      </p>
      <p className="text-neutral-400">
        {inner.attendedCount} / {inner.totalMembers} 人
      </p>
    </div>
  );
}

// =====================
// ページ本体
// =====================

export default function AnalyticsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();

  const [data, setData] = useState<CircleAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCircleAnalytics(circleId, user.uid)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : '読み込みに失敗しました')
      )
      .finally(() => setLoading(false));
  }, [circleId, user]);

  // --- ローディング ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  // --- エラー ---
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          サークルに戻る
        </Link>
        <p className="text-sm text-neutral-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const formatEventLabel = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'M/d', { locale: ja });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

  // グラフデータ（eventDate を X 軸ラベルに変換）
  const chartData = data.stats.map((s) => ({
    ...s,
    label: `${s.eventName.slice(0, 6)}…\n${formatEventLabel(s.eventDate)}`,
    shortLabel: formatEventLabel(s.eventDate),
  }));

  return (
    <div className="space-y-10">
      {/* ヘッダー */}
      <div>
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          サークルに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          📊 アナリティクス
        </h1>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-400">
            イベント数
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {data.totalEvents}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-400">
            平均出席率
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {data.avgAttendanceRate}%
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-400">
            未払い合計
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {formatAmount(data.totalUnpaidAmount)}
          </p>
        </div>
      </div>

      {/* 出席率グラフ */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-neutral-400">
          出席率の推移
        </h2>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-sm text-neutral-400">データがありません</p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#e5e5e5"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#a3a3a3' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#a3a3a3' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  content={
                    <AttendanceTooltip />
                  }
                  cursor={{ fill: '#f5f5f5' }}
                />
                <Bar dataKey="attendanceRate" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendanceRate >= 75 ? '#333333' : entry.attendanceRate >= 50 ? '#737373' : '#d4d4d4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 凡例 */}
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#333333]" />
                75%以上
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#737373]" />
                50〜74%
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#d4d4d4]" />
                49%以下
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 未払いメンバー一覧 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-neutral-400">
            未払いメンバー
          </h2>
          <span className="text-[12px] text-neutral-400">
            {data.unpaidMembers.length} 件
          </span>
        </div>

        {data.unpaidMembers.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
            <p className="text-sm text-neutral-400">未払いはありません</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2.5 text-left font-medium text-neutral-500">
                    名前
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-neutral-500">
                    イベント
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-neutral-500">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.unpaidMembers.map((m) => (
                  <tr key={`${m.eventDate}-${m.id}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-neutral-800">{m.displayName}</p>
                      {m.email && (
                        <p className="text-[11px] text-neutral-400">{m.email}</p>
                      )}
                      {m.isGuest && (
                        <span className="mt-0.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                          ゲスト
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-neutral-700">{m.eventName}</p>
                      <p className="text-[11px] text-neutral-400">
                        {formatEventLabel(m.eventDate)}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-neutral-800">
                      {formatAmount(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 bg-neutral-50">
                  <td
                    colSpan={2}
                    className="px-4 py-2.5 text-[12px] font-medium text-neutral-500"
                  >
                    合計
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-neutral-900">
                    {formatAmount(data.totalUnpaidAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
