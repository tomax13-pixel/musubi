'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { calculatePointRank } from '@/lib/types/gamification';

interface PointCounterProps {
    totalPoints: number;
}

export function PointCounter({ totalPoints }: PointCounterProps) {
    const rank = calculatePointRank(totalPoints);
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, (v) => Math.round(v));
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const controls = animate(motionValue, totalPoints, {
            duration: 1.2,
            ease: 'easeOut',
        });

        const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));

        return () => {
            controls.stop();
            unsubscribe();
        };
    }, [totalPoints, motionValue, rounded]);

    return (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${rank.style}`}>
                {rank.name}
            </span>
            <motion.span
                className="text-[13px] font-semibold tabular-nums text-foreground"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {displayValue} pt
            </motion.span>
            {rank.nextRank && (
                <span className="text-[11px] text-muted-foreground">
                    → {rank.nextRank.name}まであと{rank.nextRank.minPoints - totalPoints}pt
                </span>
            )}
        </div>
    );
}
