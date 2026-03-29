'use client';

import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { BADGE_DEFINITIONS } from '@/lib/types/gamification';
import type { UserBadge } from '@/lib/types/gamification';

interface BadgeShowcaseProps {
    userBadges: UserBadge[];
}

export function BadgeShowcase({ userBadges }: BadgeShowcaseProps) {
    const unlockedIds = new Set(userBadges.map(b => b.badgeId));

    // 獲得済みを先、未獲得を後に
    const sorted = [...BADGE_DEFINITIONS].sort((a, b) => {
        const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
        const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
        return aUnlocked - bUnlocked;
    });

    const unlockedCount = userBadges.length;
    const totalCount = BADGE_DEFINITIONS.length;

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                        実績バッジ
                    </span>
                </div>
                <span className="text-xs text-neutral-500">
                    {unlockedCount} / {totalCount}
                </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {sorted.map((badge, i) => {
                    const unlocked = unlockedIds.has(badge.id);
                    const userBadge = userBadges.find(b => b.badgeId === badge.id);

                    return (
                        <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="group relative"
                        >
                            <div
                                className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${
                                    unlocked
                                        ? 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
                                        : 'border-neutral-100 bg-neutral-50 opacity-40'
                                }`}
                            >
                                <span className="text-xl">{badge.emoji}</span>
                                <span className="text-center text-[9px] font-medium leading-tight text-neutral-600">
                                    {badge.name}
                                </span>
                            </div>

                            {/* ホバーツールチップ */}
                            <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                                <p className="whitespace-nowrap font-medium">{badge.name}</p>
                                <p className="whitespace-nowrap text-neutral-400">{badge.description}</p>
                                {userBadge && (
                                    <p className="mt-0.5 whitespace-nowrap text-neutral-500">
                                        {new Date(userBadge.unlockedAt).toLocaleDateString('ja-JP')} 獲得
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
