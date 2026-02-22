'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'; // Icons
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircleStatsAdmin, getUnpaidMembersAdmin, type CircleStats, type UnpaidMember } from '@/lib/actions/analytics.actions';
import { getCurrentUserRoleAdmin } from '@/lib/actions/admin.actions';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { formatAmount } from '@/lib/utils/date';

// Inline utility if not imported
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

export default function AnalyticsPage() {
    const params = useParams();
    const circleId = params['circleId'] as string;
    const router = useRouter();
    const { user } = useAuthContext();

    const [stats, setStats] = useState<CircleStats | null>(null);
    const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            // 1. Check Role (Skip client SDK, use Admin Action)
            const role = await getCurrentUserRoleAdmin(circleId, user.uid);
            if (role !== 'organizer') {
                setError('このページにアクセスする権限がありません');
                return;
            }

            // 2. Fetch Data
            const [statsData, unpaidData] = await Promise.all([
                getCircleStatsAdmin(circleId, user.uid),
                getUnpaidMembersAdmin(circleId, user.uid)
            ]);

            setStats(statsData);
            setUnpaidMembers(unpaidData);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'データの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    }, [circleId, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-sm text-red-600">{error}</p>
                <Link href={`/circles/${circleId}`} className="text-sm text-neutral-500 underline">
                    戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-2 text-muted-foreground">
                <Link href={`/circles/${circleId}`} className="hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="text-sm">アナリティクス</span>
            </div>

            <div className="flex items-end justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">ダッシュボード</h1>
            </div>

            {/* Summary Cards */}
            {stats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">平均出席率</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round((stats.averageAttendance / (stats.memberCount || 1)) * 100)}%</p>
                        <p className="text-[11px] text-muted-foreground md:mt-1">
                            AVG: {stats.averageAttendance.toFixed(1)}人 / 全{stats.memberCount}人
                        </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-medium">総イベント数</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.totalEvents}</p>
                        <p className="text-[11px] text-muted-foreground md:mt-1">
                            今後の予定: {stats.upcomingEvents}件
                        </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">未回収金総額</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {formatCurrency(unpaidMembers.reduce((sum, m) => sum + m.totalUnpaid, 0))}
                        </p>
                        <p className="text-[11px] text-muted-foreground md:mt-1">
                            対象人数: {unpaidMembers.length}人
                        </p>
                    </div>
                </div>
            )}

            {/* Attendance Chart */}
            {stats?.monthlyStats && stats.monthlyStats.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-base font-medium">📅 月別出席数（直近6ヶ月）</h2>
                    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.monthlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}人`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e5e5',
                                            borderRadius: '6px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                        itemStyle={{ color: '#333333', fontSize: '12px' }}
                                        cursor={{ fill: '#f5f5f5' }}
                                    />
                                    <Bar
                                        dataKey="attendance"
                                        name="出席者数"
                                        fill="#333333"
                                        radius={[2, 2, 0, 0]}
                                        barSize={32}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Unpaid Members Section */}
            <div className="space-y-4">
                <h2 className="text-base font-medium">⚠️ 未払い者リスト</h2>
                {unpaidMembers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
                        <p className="text-sm text-muted-foreground">未払いのメンバーはいません 🎉</p>
                    </div>
                ) : (
                    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
                        <div className="divide-y divide-neutral-100">
                            {unpaidMembers.map((member) => (
                                <div key={member.uid} className="bg-white">
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                                        onClick={() => setExpandedUser(expandedUser === member.uid ? null : member.uid)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium">
                                                {member.displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{member.displayName}</p>
                                                <p className="text-[11px] text-muted-foreground">{member.unpaidEvents.length}件の未払い</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-neutral-900">
                                                {formatCurrency(member.totalUnpaid)}
                                            </span>
                                            {expandedUser === member.uid ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedUser === member.uid && (
                                        <div className="bg-neutral-50 px-4 pb-4 pt-1">
                                            <div className="ml-11 space-y-2">
                                                {member.unpaidEvents.map((event, idx) => (
                                                    <div key={`${event.eventId}-${idx}`} className="flex justify-between text-xs py-1 border-b border-neutral-200 last:border-0">
                                                        <span className="text-muted-foreground">{event.eventName} <span className="text-neutral-300">|</span> {new Date(event.date).toLocaleDateString()}</span>
                                                        <span className="font-medium">{formatCurrency(event.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Attendance Chart (Placeholder for now, implementation plan mentioned it) */}
            {/* Since I haven't implemented historical attendance data fetching yet in stats action detail-wise, 
          I will stick to keeping it simple or omitting if data is missing. 
          The plan said "Attendance Trend Graph". 
          But `getCircleStatsAdmin` returns aggregate stats. 
          To draw a trend line, I need daily/event-wise stats.
          I'll skip the chart for this iteration to prioritize "Unpaid" as per user emphasis on "Analytics & Unpaid".
          Wait, user request said "画面上部に...統計サマリー、下部に...未払い者リスト". 
          Graph was mentioned in my plan ("Attendance Trend Graph").
          If I want to do it, I need more data. 
          For now, I'll stick to the Summary Cards and Unpaid List which are most critical and strictly requested.
          I'll add a small note or maybe implement chart in next iteration if needed.
          
          Actually, let's just do it right. I'll add `recentAttendance` to `getCircleStatsAdmin` later if needed.
          For now, the requested features are strictly Summary and Unpaid List.
      */}

        </div>
    );
}
