'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface EarlyBirdCountdownProps {
    eventDate: string; // ISO string
}

/**
 * 早期回答ボーナスのカウントダウン表示
 * イベント3日前までに回答すると+5ptのボーナス
 */
export function EarlyBirdCountdown({ eventDate }: EarlyBirdCountdownProps) {
    const [remaining, setRemaining] = useState<string | null>(null);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const eventMs = new Date(eventDate).getTime();
            const deadline = eventMs - 3 * 24 * 60 * 60 * 1000; // 3日前
            const diff = deadline - now;

            if (diff <= 0) {
                setRemaining(null);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours >= 24) {
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                setRemaining(`${days}日${remainingHours}時間`);
            } else {
                setRemaining(`${hours}時間${minutes}分`);
            }

            // プログレス: イベント作成〜締切の間の進捗（簡略化: 7日間を100%とする）
            const totalWindow = 7 * 24 * 60 * 60 * 1000;
            setProgress(Math.max(0, Math.min(100, (diff / totalWindow) * 100)));
        };

        update();
        const interval = setInterval(update, 60000); // 1分ごとに更新
        return () => clearInterval(interval);
    }, [eventDate]);

    if (!remaining) return null;

    return (
        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <Zap className="h-2.5 w-2.5" />
            <span>+5pt あと{remaining}</span>
            <div className="h-1 w-8 overflow-hidden rounded-full bg-emerald-100">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
