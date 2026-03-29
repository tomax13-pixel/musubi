'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface RankProgressProps {
    totalPoints: number;
    rankName: string;
    rankStyle: string;
    nextRank: { name: string; minPoints: number } | null;
    progress: number;
}

export function RankProgress({ totalPoints, rankName, rankStyle, nextRank, progress }: RankProgressProps) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                        ランク
                    </span>
                </div>
                <span className="text-sm font-bold">{totalPoints} pt</span>
            </div>

            <div className="mt-3 flex items-center gap-3">
                <div className={`inline-block rounded-md px-3 py-1 text-xs font-medium ${rankStyle}`}>
                    {rankName}
                </div>
                {nextRank && (
                    <span className="text-xs text-neutral-500">
                        → {nextRank.name} まであと {nextRank.minPoints - totalPoints} pt
                    </span>
                )}
                {!nextRank && (
                    <span className="text-xs text-neutral-500">最高ランク達成！</span>
                )}
            </div>

            {nextRank && (
                <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                        <motion.div
                            className="h-full rounded-full bg-neutral-900"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                        <span>{rankName}</span>
                        <span>{nextRank.name}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
