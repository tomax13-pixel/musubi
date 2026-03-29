'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, AlertCircle, ChevronDown, ChevronUp, Wallet, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircleStatsAdmin, getUnpaidMembersAdmin, getMemberRankingAdmin, type CircleStats, type UnpaidMember, type MemberRanking } from '@/lib/actions/analytics.actions';
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
    const [rankings, setRankings] = useState<MemberRanking[]>([]);
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
            const [statsData, unpaidData, rankingData] = await Promise.all([
                getCircleStatsAdmin(circleId, user.uid),
                getUnpaidMembersAdmin(circleId, user.uid),
                getMemberRankingAdmin(circleId, user.uid),
            ]);

            setStats(statsData);
            setUnpaidMembers(unpaidData);
            setRankings(rankingData);
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

    const stagger = (i: number) => ({
        initial: { opacity: 0, y: 12 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
    });

    return (
        <div className="space-y-8">
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
                <motion.div {...stagger(0)} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">メンバー数</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.memberCount}</p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">平均出席率</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round((stats.averageAttendance / (stats.memberCount || 1)) * 100)}%</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            平均 {stats.averageAttendance.toFixed(1)}人 / イベント
                        </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">総イベント数</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.totalEvents}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            今後 {stats.upcomingEvents}件
                        </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Wallet className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">集金率</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {stats.totalPayments > 0
                                ? Math.round((stats.confirmedPayments / stats.totalPayments) * 100)
                                : 0}%
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {stats.confirmedPayments} / {stats.totalPayments}件
                        </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">未回収金</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {formatCurrency(unpaidMembers.reduce((sum, m) => sum + m.totalUnpaid, 0))}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {unpaidMembers.length}人
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Two-column layout: Chart + Rankings */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Attendance Chart */}
                {stats?.monthlyStats && stats.monthlyStats.length > 0 && (
                    <motion.div {...stagger(1)} className="space-y-3 lg:col-span-2">
                        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                            月別出席数（直近6ヶ月）
                        </h2>
                        <div className="rounded-lg border border-neutral-200 bg-white p-5">
                            <div className="h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#a3a3a3"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#a3a3a3"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e5e5e5',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                            cursor={{ fill: '#fafafa' }}
                                        />
                                        <Bar
                                            dataKey="attendance"
                                            name="出席者数"
                                            fill="#262626"
                                            radius={[3, 3, 0, 0]}
                                            barSize={28}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Member Rankings */}
                <motion.div {...stagger(2)} className="space-y-3">
                    <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                        <Trophy className="mr-1 inline-block h-3.5 w-3.5" />
                        出席ランキング
                    </h2>
                    <div className="rounded-lg border border-neutral-200 bg-white">
                        {rankings.length === 0 ? (
                            <p className="p-6 text-center text-sm text-muted-foreground">データがありません</p>
                        ) : (
                            <div className="divide-y divide-neutral-100">
                                {rankings.map((member) => {
                                    const medal = member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : member.rank === 3 ? '🥉' : null;
                                    return (
                                        <div key={member.uid} className="flex items-center gap-3 px-4 py-2.5">
                                            <span className="w-6 text-center text-xs font-medium text-neutral-400">
                                                {medal ?? `${member.rank}`}
                                            </span>
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium">
                                                {member.displayName.charAt(0)}
                                            </div>
                                            <span className="min-w-0 flex-1 truncate text-sm">{member.displayName}</span>
                                            <span className="text-xs font-medium text-neutral-600">{member.attendanceCount}回</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Unpaid Members Section */}
            <motion.div {...stagger(3)} className="space-y-3">
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                    未払いリスト
                </h2>
                {unpaidMembers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
                        <p className="text-sm text-muted-foreground">未払いのメンバーはいません</p>
                    </div>
                ) : (
                    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                        <div className="divide-y divide-neutral-100">
                            {unpaidMembers.map((member) => (
                                <div key={member.uid}>
                                    <div
                                        className="flex items-center justify-between border-l-2 border-l-transparent p-4 cursor-pointer transition-colors hover:bg-neutral-50 hover:border-l-neutral-400"
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
            </motion.div>
        </div>
    );
}
