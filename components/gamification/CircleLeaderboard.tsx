'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCircleLeaderboard } from '@/lib/actions/gamification.actions';
import type { LeaderboardEntry } from '@/lib/actions/gamification.actions';
import { calculatePointRank } from '@/lib/types/gamification';

interface CircleLeaderboardProps {
    circleId: string;
    currentUid: string;
}

const rankMedals = ['🥇', '🥈', '🥉'];

export function CircleLeaderboard({ circleId, currentUid }: CircleLeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCircleLeaderboard(circleId, 10)
            .then(setEntries)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [circleId]);

    if (loading) return null;
    if (entries.length === 0) return null;

    const userInTop = entries.findIndex(e => e.uid === currentUid);

    return (
        <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} />
                ランキング
            </h3>
            <div className="rounded-lg border border-neutral-200 bg-white">
                {entries.slice(0, 5).map((entry, i) => {
                    const isCurrentUser = entry.uid === currentUid;
                    const rank = calculatePointRank(entry.totalPoints);

                    return (
                        <motion.div
                            key={entry.uid}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-center gap-3 px-3.5 py-2.5 ${
                                i < entries.slice(0, 5).length - 1 ? 'border-b border-neutral-100' : ''
                            } ${isCurrentUser ? 'bg-neutral-50' : ''}`}
                        >
                            {/* Rank number/medal */}
                            <span className="w-6 text-center text-[13px] font-semibold">
                                {i < 3 ? rankMedals[i] : `${i + 1}`}
                            </span>

                            {/* Avatar */}
                            {entry.photoURL ? (
                                <img
                                    src={entry.photoURL}
                                    alt=""
                                    className="h-7 w-7 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-medium text-neutral-500">
                                    {entry.displayName.charAt(0)}
                                </div>
                            )}

                            {/* Name + rank badge */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`truncate text-[13px] ${isCurrentUser ? 'font-semibold' : 'font-medium'}`}>
                                        {entry.displayName}
                                    </span>
                                    {isCurrentUser && (
                                        <span className="shrink-0 rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-bold text-neutral-600">
                                            あなた
                                        </span>
                                    )}
                                </div>
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${rank.style}`}>
                                    {rank.name}
                                </span>
                            </div>

                            {/* Points */}
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                                {entry.totalPoints} pt
                            </span>
                        </motion.div>
                    );
                })}

                {/* Current user not in top 5 */}
                {userInTop === -1 && entries.length > 5 && (() => {
                    const userEntry = entries.find(e => e.uid === currentUid);
                    if (!userEntry) return null;
                    const userRank = calculatePointRank(userEntry.totalPoints);
                    const userPosition = entries.findIndex(e => e.uid === currentUid) + 1;
                    return (
                        <div className="flex items-center gap-3 border-t border-dashed border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
                            <span className="w-6 text-center text-[13px] font-semibold">{userPosition}</span>
                            {userEntry.photoURL ? (
                                <img src={userEntry.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-medium text-neutral-500">
                                    {userEntry.displayName.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate text-[13px] font-semibold">{userEntry.displayName}</span>
                                    <span className="shrink-0 rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-bold text-neutral-600">あなた</span>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${userRank.style}`}>
                                    {userRank.name}
                                </span>
                            </div>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums">{userEntry.totalPoints} pt</span>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
