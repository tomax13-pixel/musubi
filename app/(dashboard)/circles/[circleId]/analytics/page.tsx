'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import {
  getCircleAttendanceStats,
  getUnpaidMembersForCircle,
  type EventAttendanceData,
  type UnpaidMember,
} from '@/lib/actions/analytics.actions';
import { ArrowLeft, BarChart2, AlertCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// イベント名を短縮（グラフ表示用）
function shortenName(name: string, max = 8): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

// 未払いリストをイベントごとにグループ化
function groupByEvent(members: UnpaidMember[]): Record<string, { eventName: string; members: UnpaidMember[] }> {
  const groups: Record<string, { eventName: string; members: UnpaidMember[] }> = {};
  for (const member of members) {
    if (!groups[member.eventId]) {
      groups[member.eventId] = { eventName: member.eventName, members: [] };
    }
    groups[member.eventId]!.members.push(member);
  }
  return groups;
}

export default function AnalyticsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EventAttendanceData[]>([]);
  const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const role = await getCurrentUserRole(circleId, user.uid);
        if (role !== 'organizer') {
          setIsOrganizer(false);
          setLoading(false);
          return;
        }
        setIsOrganizer(true);

        const [attendanceStats, unpaidList] = await Promise.all([
          getCircleAttendanceStats(circleId),
          getUnpaidMembersForCircle(circleId),
        ]);

        setStats(attendanceStats);
        setUnpaidMembers(unpaidList);
      } catch (error) {
        console.error('アナリティクスデータ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, circleId]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!isOrganizer) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-neutral-500">アナリティクスは幹事のみ閲覧できます</p>
        <Link
          href={`/circles/${circleId}`}
          className="mt-4 inline-block text-sm underline text-neutral-600"
        >
          サークルに戻る
        </Link>
      </div>
    );
  }

  // Recharts 用データ（グラフ表示は新しい順、X軸は短縮名）
  const chartData = [...stats].reverse().map((s) => ({
    name: shortenName(s.eventName),
    attendanceRate: s.attendanceRate,
    attended: s.attendedCount,
    total: s.totalMembers,
  }));

  const unpaidGroups = groupByEvent(unpaidMembers);
  const unpaidEventIds = Object.keys(unpaidGroups);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ヘッダー */}
      <div>
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1 text-[13px] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          サークルに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">アナリティクス</h1>
        <p className="mt-1 text-[13px] text-neutral-500">幹事専用 — 出席率・未払い管理</p>
      </div>

      {/* 出席率グラフ */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <BarChart2 className="h-3.5 w-3.5" />
          イベント別出席率
        </div>

        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            イベントデータがありません
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: '#f5f5f5' }}
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxShadow: 'none',
                }}
                formatter={(value: number, _name: string, props: { payload?: { attended?: number; total?: number } }) => [
                  `${value}% (${props.payload?.attended ?? 0}/${props.payload?.total ?? 0}人)`,
                  '出席率',
                ]}
              />
              <Bar
                dataKey="attendanceRate"
                fill="#333333"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* イベント別サマリー */}
      {stats.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              イベント別サマリー
            </h2>
          </div>
          <div className="divide-y divide-neutral-100">
            {stats.map((s) => (
              <div key={s.eventId} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{s.eventName}</p>
                  <p className="mt-0.5 text-[12px] text-neutral-500">
                    {new Date(s.eventDate).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-neutral-900">
                    {s.attendanceRate}%
                  </p>
                  <p className="mt-0.5 text-[12px] text-neutral-500">
                    {s.attendedCount} / {s.totalMembers} 人
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未払いメンバーリスト（アコーディオン） */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <AlertCircle className="h-3.5 w-3.5" />
            未払いメンバー
            {unpaidMembers.length > 0 && (
              <span className="ml-auto inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                {unpaidMembers.length} 件
              </span>
            )}
          </div>
        </div>

        {unpaidEventIds.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-neutral-400">未払いのメンバーはいません</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {unpaidEventIds.map((eventId) => {
              const group = unpaidGroups[eventId]!;
              const isExpanded = expandedEvents.has(eventId);
              return (
                <div key={eventId}>
                  {/* イベントヘッダー（折り畳みトグル） */}
                  <button
                    onClick={() => toggleEvent(eventId)}
                    className="flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{group.eventName}</p>
                      <p className="mt-0.5 text-[12px] text-neutral-500">
                        未払い {group.members.length} 名
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                    )}
                  </button>

                  {/* メンバーリスト（展開時） */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50">
                      {group.members.map((member) => (
                        <div
                          key={`${eventId}-${member.uid}`}
                          className="flex items-center justify-between border-b border-neutral-100 px-6 py-2.5 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm text-neutral-900">{member.displayName}</p>
                            {member.email && (
                              <p className="mt-0.5 text-[11px] text-neutral-400">{member.email}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium tabular-nums text-neutral-700">
                            ¥{member.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
