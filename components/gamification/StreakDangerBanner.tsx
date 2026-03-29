'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { StreakDanger } from '@/lib/actions/dashboard.actions';

interface StreakDangerBannerProps {
    danger: StreakDanger;
}

export function StreakDangerBanner({ danger }: StreakDangerBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Link
                href={`/circles/${danger.circleId}/events/${danger.eventId}`}
                className="group block rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-100"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-orange-900">
                            {danger.currentStreak}回連続出席中!
                        </p>
                        <p className="text-[12px] text-orange-700">
                            「{danger.nextEventName}」に参加してストリークを維持しよう →
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
