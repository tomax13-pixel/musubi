'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, Calendar, CalendarCheck, Users, Flame } from 'lucide-react';

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

interface KpiCardsProps {
    attendanceRate: number;
    totalAttendance: number;
    thisMonthAttendance: number;
    circleCount: number;
    streak: number;
}

export function KpiCards({ attendanceRate, totalAttendance, thisMonthAttendance, circleCount, streak }: KpiCardsProps) {
    const animatedAttendanceRate = useCountUp(attendanceRate);
    const animatedTotalSessions = useCountUp(totalAttendance);
    const animatedThisMonth = useCountUp(thisMonthAttendance);
    const animatedCircleCount = useCountUp(circleCount);
    const animatedStreak = useCountUp(streak);

    const cards = [
        {
            icon: TrendingUp,
            label: '出席率',
            value: `${animatedAttendanceRate.toFixed(1)}%`,
        },
        {
            icon: Calendar,
            label: '累計出席',
            value: `${animatedTotalSessions}`,
        },
        {
            icon: CalendarCheck,
            label: '今月の出席',
            value: `${animatedThisMonth}`,
        },
        {
            icon: Users,
            label: '所属サークル',
            value: `${animatedCircleCount}`,
        },
        {
            icon: Flame,
            label: 'ストリーク',
            value: `${animatedStreak}`,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {cards.map((card, i) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (i + 1) }}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <card.icon className="h-3.5 w-3.5" />
                        {card.label}
                    </div>
                    <div className="mt-3 text-3xl font-bold">{card.value}</div>
                </motion.div>
            ))}
        </div>
    );
}
