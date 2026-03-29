'use client';

import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginStreakIndicatorProps {
    loginStreak: number;
    bonusAwarded: number;
    isNewDay: boolean;
}

/**
 * ダッシュボード挨拶エリアに配置するログインストリーク表示
 */
export function LoginStreakIndicator({ loginStreak, bonusAwarded, isNewDay }: LoginStreakIndicatorProps) {
    if (loginStreak <= 0) return null;

    // 次のマイルストーンまで
    let nextMilestone = 7;
    if (loginStreak >= 7 && loginStreak < 30) nextMilestone = 30;
    else if (loginStreak >= 30) nextMilestone = loginStreak + (30 - (loginStreak % 30));
    const daysUntilNext = nextMilestone - loginStreak;

    return (
        <motion.div
            initial={isNewDay ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2"
        >
            <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
                <Flame className="h-3 w-3" />
                <span>{loginStreak}日連続ログイン</span>
            </div>
            {bonusAwarded > 0 && (
                <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-[11px] font-bold text-emerald-600"
                >
                    +{bonusAwarded}pt ボーナス!
                </motion.span>
            )}
            {daysUntilNext <= 3 && daysUntilNext > 0 && (
                <span className="text-[10px] text-muted-foreground">
                    あと{daysUntilNext}日で{nextMilestone}日!
                </span>
            )}
        </motion.div>
    );
}
