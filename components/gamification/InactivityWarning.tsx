'use client';

import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface InactivityWarningProps {
    lastPointsEarnedAt: string; // ISO date or empty
}

/**
 * 30日間無活動の警告バナー（ランクダウンはしない。危機感のみ）
 */
export function InactivityWarning({ lastPointsEarnedAt }: InactivityWarningProps) {
    if (!lastPointsEarnedAt) return null;

    const lastDate = new Date(lastPointsEarnedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        >
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.8} />
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-amber-900">
                        {diffDays}日間活動がありません
                    </p>
                    <p className="text-[12px] text-amber-700">
                        ランクを維持するためにイベントに参加しましょう!
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
