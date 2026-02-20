'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import {
    getUserProfile,
    updateUserProfile,
    getUserAttendanceHistory,
    getUserPaymentHistory,
    getTotalEventsForUser,
    calculateRank,
    calculateStreak,
    getHeatmapData,
} from '@/lib/actions/user.actions';
import type { UserProfile, AttendanceRecord, PaymentRecord } from '@/lib/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Edit, TrendingUp, Calendar, DollarSign, Award, Flame, BadgeCheck, Bell, BellRing, QrCode } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { QRCodeSVG } from 'qrcode.react';

// カウントアップ用のカスタムフック
function useCountUp(target: number, duration: number = 800) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const [value, setValue] = useState(0);

    useEffect(() => {
        const controls = animate(count, target, {
            duration: duration / 1000,
            ease: 'easeOut',
        });

        const unsubscribe = rounded.on('change', (latest) => setValue(latest));

        return () => {
            controls.stop();
            unsubscribe();
        };
    }, [target, count, rounded, duration]);

    return value;
}

export default function MyPage() {
    const { user } = useAuthContext();
    const { permissionState, requestPermission } = useNotifications(user?.uid);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [heatmapData, setHeatmapData] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editFaculty, setEditFaculty] = useState('');
    const [editGrade, setEditGrade] = useState('');
    const [showRankUp, setShowRankUp] = useState(false);
    const [newRank, setNewRank] = useState('');
    const [previousStreak, setPreviousStreak] = useState(0);

    const attendanceRate = totalEvents > 0 ? ((attendanceRecords.length / totalEvents) * 100) : 0;
    const streak = calculateStreak(attendanceRecords);
    const totalPaid = paymentHistory
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);
    const hasUnpaid = paymentHistory.some((p) => p.status === 'unpaid');
    const membershipDays = profile?.createdAt
        ? Math.floor((Date.now() - profile.createdAt.toMillis()) / (1000 * 60 * 60 * 24))
        : 0;

    // カウントアップ用の値
    const animatedAttendanceRate = useCountUp(attendanceRate);
    const animatedTotalSessions = useCountUp(attendanceRecords.length);
    const animatedStreak = useCountUp(streak);
    const animatedMembershipDays = useCountUp(membershipDays);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);
                setEditFaculty(userProfile?.faculty || '');
                setEditGrade(userProfile?.grade || '');

                const attendance = await getUserAttendanceHistory(user.uid);
                setAttendanceRecords(attendance);

                const payments = await getUserPaymentHistory(user.uid);
                setPaymentHistory(payments);

                const events = await getTotalEventsForUser(user.uid);
                setTotalEvents(events);

                const heatmap = await getHeatmapData(user.uid);
                setHeatmapData(heatmap);

                // ランクアップチェック
                const currentRank = calculateRank(attendance.length);
                const savedRank = localStorage.getItem(`rank_${user.uid}`);
                if (savedRank && savedRank !== currentRank) {
                    setNewRank(currentRank);
                    setShowRankUp(true);
                    fireConfetti();
                    setTimeout(() => setShowRankUp(false), 3000);
                }
                localStorage.setItem(`rank_${user.uid}`, currentRank);

                // ストリーク更新チェック
                const currentStreak = calculateStreak(attendance);
                const savedStreak = parseInt(localStorage.getItem(`streak_${user.uid}`) || '0');
                if (savedStreak < currentStreak && currentStreak >= 3) {
                    fireStreakSparks();
                }
                setPreviousStreak(savedStreak);
                localStorage.setItem(`streak_${user.uid}`, currentStreak.toString());
            } catch (error) {
                console.error('データ取得エラー:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const fireConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#000000', '#FFFFFF', '#C0C0C0'],
        });
    };

    const fireStreakSparks = () => {
        // 火の粉エフェクト（白いパーティクルが上昇）
        const count = 30;
        const defaults = {
            origin: { y: 0.7 },
            colors: ['#FFFFFF', '#F3F4F6', '#E5E7EB'],
        };

        function fire(particleRatio: number, opts: any) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
                gravity: -0.3,
                drift: 0.2,
                ticks: 200,
                scalar: 0.8,
            });
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });

        fire(0.2, {
            spread: 60,
        });

        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8,
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2,
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        try {
            await updateUserProfile(user.uid, {
                faculty: editFaculty,
                grade: editGrade,
            });
            setProfile({ ...profile!, faculty: editFaculty, grade: editGrade });
            setDialogOpen(false);
        } catch (error) {
            console.error('プロフィール更新エラー:', error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
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

    const rank = calculateRank(attendanceRecords.length);

    // ヒートマップ用の日付配列（過去1年間）
    const generateHeatmapDates = () => {
        const dates = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    const heatmapDates = generateHeatmapDates();

    return (
        <div className="mx-auto max-w-5xl space-y-10">
            {/* ランクアップ演出 */}
            {showRankUp && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                >
                    <div className="rounded-lg bg-white p-12 text-center">
                        <h2 className="text-4xl font-bold tracking-tight">RANK UP</h2>
                        <p className="mt-4 text-6xl font-bold">{newRank}</p>
                    </div>
                </motion.div>
            )}

            {/* プロフィール・ヘッダー */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold tracking-tight">{profile.displayName}</h1>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <button className="rounded-md p-2 transition-colors hover:bg-neutral-100">
                                <Edit className="h-4 w-4" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>プロフィール編集</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="faculty">学部</Label>
                                    <input
                                        id="faculty"
                                        className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                        value={editFaculty}
                                        onChange={(e) => setEditFaculty(e.target.value)}
                                        placeholder="例：経済学部"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grade">学年</Label>
                                    <select
                                        id="grade"
                                        className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                        value={editGrade}
                                        onChange={(e) => setEditGrade(e.target.value)}
                                    >
                                        <option value="">選択してください</option>
                                        <option value="1年生">1年生</option>
                                        <option value="2年生">2年生</option>
                                        <option value="3年生">3年生</option>
                                        <option value="4年生">4年生</option>
                                        <option value="既卒">既卒</option>
                                    </select>
                                </div>
                                <Button onClick={handleSaveProfile} className="w-full">
                                    保存
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {profile.faculty && profile.grade && (
                    <p className="text-sm text-gray-500">
                        {profile.faculty} / {profile.grade}
                    </p>
                )}

                <div className="flex items-center gap-2">
                    <div className="inline-block rounded-md bg-black px-3 py-1 text-xs font-medium text-white">
                        {rank}
                    </div>
                    {!hasUnpaid && (
                        <div className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Verified Member
                        </div>
                    )}
                </div>
            </div>

            {/* KPIカード */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        出席率
                    </div>
                    <div className="mt-3 text-3xl font-bold">{animatedAttendanceRate.toFixed(1)}%</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        累計出席
                    </div>
                    <div className="mt-3 text-3xl font-bold">{animatedTotalSessions}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`rounded-lg border border-neutral-200 bg-white p-5 ${streak >= 3 ? 'relative overflow-hidden' : ''
                        }`}
                >
                    {/* ストリーク3以上の場合、パルスエフェクト */}
                    {streak >= 3 && (
                        <motion.div
                            className="absolute inset-0 bg-white opacity-20"
                            animate={{
                                scale: [1, 1.05, 1],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                    )}
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                            <Flame className={`h-3.5 w-3.5 ${streak >= 3 ? 'text-black' : ''}`} />
                            連続出席
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{animatedStreak}</span>
                            {streak >= 3 && <Flame className="h-5 w-5 text-black" />}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        会員日数
                    </div>
                    <div className="mt-3 text-3xl font-bold">{animatedMembershipDays}</div>
                </motion.div>
            </div>

            {/* アクティビティ・ヒートマップ */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    出席ヒートマップ
                </h2>
                <div className="grid grid-cols-52 gap-1">
                    {heatmapDates.map((date) => (
                        <div
                            key={date}
                            className={`h-3 w-3 rounded-sm ${heatmapData[date as string] ? 'bg-black' : 'bg-neutral-100'
                                }`}
                            title={date}
                        />
                    ))}
                </div>
                <p className="mt-3 text-xs text-neutral-500">過去1年間の出席記録</p>
            </div>

            {/* フィナンシャル・サマリー */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <DollarSign className="h-3.5 w-3.5" />
                    支払いサマリー
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">¥{totalPaid.toLocaleString()}</span>
                    <span className="text-sm text-neutral-500">累計支払</span>
                </div>
                {!hasUnpaid && (
                    <div className="mt-3 inline-block rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        ステータス: すべて完了
                    </div>
                )}
            </div>

            {/* 通知設定 */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <Bell className="h-3.5 w-3.5" />
                    通知設定
                </div>
                <div className="mt-4">
                    {permissionState === 'granted' && (
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <BellRing className="h-4 w-4" />
                            <span>通知は有効です</span>
                        </div>
                    )}
                    {permissionState === 'denied' && (
                        <p className="text-sm text-neutral-500">
                            ブラウザの設定から通知を許可してください。
                        </p>
                    )}
                    {permissionState === 'default' && (
                        <button
                            onClick={requestPermission}
                            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-50"
                        >
                            <Bell className="h-4 w-4" />
                            プッシュ通知を有効にする
                        </button>
                    )}
                    {permissionState === 'unsupported' && (
                        <p className="text-sm text-neutral-500">
                            このブラウザはプッシュ通知に対応していません。
                        </p>
                    )}
                </div>
            </div>

            {/* デジタル会員証 */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <QrCode className="h-3.5 w-3.5" />
                    デジタル会員証
                </div>
                <div className="mt-4 flex flex-col items-center gap-4">
                    <div className="rounded-lg border border-neutral-100 bg-white p-4">
                        <QRCodeSVG
                            value={JSON.stringify({ type: 'musubi_member', uid: user.uid })}
                            size={160}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">{profile.displayName}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                            イベント会場でこのQRコードを幹事に見せてチェックインしてください
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
