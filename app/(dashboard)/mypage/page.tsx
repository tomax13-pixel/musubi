'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/components/auth/AuthProvider';
import {
    getUserProfile,
    getUserAttendanceHistory,
    getUserPaymentHistory,
    getTotalEventsForUser,
    getHeatmapData,
} from '@/lib/actions/user.actions';
import { getCirclesForUser } from '@/lib/actions/circle.actions';
import { getUserGamificationStats, migrateExistingUserPoints, getUserBadges, checkAndGrantBadges } from '@/lib/actions/gamification.actions';
import { calculatePointRank } from '@/lib/types/gamification';
import type { UserProfile, AttendanceRecord, PaymentRecord } from '@/lib/types/models';
import type { UserGamificationStats, UserBadge } from '@/lib/types/gamification';

import { ProfileHeader } from '@/components/mypage/ProfileHeader';
import { RankProgress } from '@/components/mypage/RankProgress';
import { DigitalMemberCard } from '@/components/mypage/DigitalMemberCard';
import { KpiCards } from '@/components/mypage/KpiCards';
import { AttendanceHeatmap } from '@/components/mypage/AttendanceHeatmap';
import { PaymentSummary } from '@/components/mypage/PaymentSummary';
import { BadgeShowcase } from '@/components/mypage/BadgeShowcase';

export default function MyPage() {
    const { user } = useAuthContext();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [circleCount, setCircleCount] = useState(0);
    const [gamificationStats, setGamificationStats] = useState<UserGamificationStats | null>(null);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const [userProfile, attendance, payments, events, heatmap, circles] = await Promise.all([
                getUserProfile(user.uid),
                getUserAttendanceHistory(user.uid),
                getUserPaymentHistory(user.uid),
                getTotalEventsForUser(user.uid),
                getHeatmapData(user.uid),
                getCirclesForUser(user.uid),
            ]);

            setProfile(userProfile);
            setAttendanceRecords(attendance);
            setPaymentHistory(payments);
            setTotalEvents(events);
            setHeatmapData(heatmap);
            setCircleCount(circles.length);

            // ゲーミフィケーション: 統計取得（なければ遡及マイグレーション）
            let stats = await getUserGamificationStats(user.uid);
            if (stats.totalPoints === 0 && attendance.length > 0) {
                // 既存データから遡及変換
                await migrateExistingUserPoints(user.uid);
                stats = await getUserGamificationStats(user.uid);
            }
            setGamificationStats(stats);

            // バッジチェック＆取得
            await checkAndGrantBadges(user.uid);
            const userBadges = await getUserBadges(user.uid);
            setBadges(userBadges);
        } catch (error) {
            console.error('データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 計算値
    const attendanceRate = totalEvents > 0 ? (attendanceRecords.length / totalEvents) * 100 : 0;
    const totalPaid = paymentHistory
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);
    const hasUnpaid = paymentHistory.some((p) => p.status === 'unpaid');

    // ポイントベースのランク計算
    const totalPoints = gamificationStats?.totalPoints ?? 0;
    const rankInfo = calculatePointRank(totalPoints);
    const streak = gamificationStats?.currentStreak ?? 0;

    // 今月の出席数
    const now = new Date();
    const thisMonthAttendance = attendanceRecords.filter((r) => {
        if (!r.checkedInAt) return false;
        const d = r.checkedInAt.toDate();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl space-y-8">
                <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
                <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
                <div className="h-48 animate-pulse rounded-lg bg-neutral-100" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
                    ))}
                </div>
                <div className="h-48 animate-pulse rounded-lg bg-neutral-100" />
            </div>
        );
    }

    if (!profile || !user) {
        return (
            <div className="text-center text-muted-foreground">
                プロフィール情報が見つかりません
            </div>
        );
    }

    const stagger = (i: number) => ({
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
    });

    return (
        <div className="mx-auto max-w-5xl space-y-10">
            <motion.div {...stagger(0)}>
                <ProfileHeader
                    profile={profile}
                    rank={rankInfo.name}
                    rankStyle={rankInfo.style}
                    streak={streak}
                    hasUnpaid={hasUnpaid}
                    userId={user.uid}
                    onProfileUpdate={fetchData}
                />
            </motion.div>

            <motion.div {...stagger(1)}>
                <RankProgress
                    totalPoints={totalPoints}
                    rankName={rankInfo.name}
                    rankStyle={rankInfo.style}
                    nextRank={rankInfo.nextRank}
                    progress={rankInfo.progress}
                />
            </motion.div>

            <motion.div {...stagger(2)}>
                <BadgeShowcase userBadges={badges} />
            </motion.div>

            <motion.div {...stagger(3)}>
                <DigitalMemberCard
                    userId={user.uid}
                    displayName={profile.displayName}
                />
            </motion.div>

            <motion.div {...stagger(4)}>
                <KpiCards
                    attendanceRate={attendanceRate}
                    totalAttendance={attendanceRecords.length}
                    thisMonthAttendance={thisMonthAttendance}
                    circleCount={circleCount}
                    streak={streak}
                />
            </motion.div>

            <motion.div {...stagger(5)}>
                <AttendanceHeatmap heatmapData={heatmapData} />
            </motion.div>

            <motion.div {...stagger(6)}>
                <PaymentSummary
                    paymentHistory={paymentHistory}
                    totalPaid={totalPaid}
                />
            </motion.div>
        </div>
    );
}
