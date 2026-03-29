'use client';

import { useMemo } from 'react';

interface AttendanceHeatmapProps {
    heatmapData: Record<string, number>;
}

function getCellColor(count: number): string {
    if (count >= 3) return 'bg-neutral-900';
    if (count === 2) return 'bg-neutral-500';
    if (count === 1) return 'bg-neutral-300';
    return 'bg-neutral-100';
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function AttendanceHeatmap({ heatmapData }: AttendanceHeatmapProps) {
    const { dates, monthPositions } = useMemo(() => {
        const dates: string[] = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0] as string);
        }

        // 月ラベルの位置を計算（週単位）
        const monthPositions: { label: string; col: number }[] = [];
        let lastMonth = -1;
        dates.forEach((dateStr, index) => {
            const month = new Date(dateStr).getMonth();
            const weekIndex = Math.floor(index / 7);
            if (month !== lastMonth) {
                monthPositions.push({ label: MONTH_LABELS[month] ?? '', col: weekIndex });
                lastMonth = month;
            }
        });

        return { dates, monthPositions };
    }, []);

    // 週ごとに日付をグループ化（縦7日 × 横52-53週）
    const weeks = useMemo(() => {
        const result: string[][] = [];
        for (let i = 0; i < dates.length; i += 7) {
            result.push(dates.slice(i, i + 7));
        }
        return result;
    }, [dates]);

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
                出席ヒートマップ
            </h2>
            <div className="overflow-x-auto">
                {/* 月ラベル */}
                <div className="flex" style={{ minWidth: `${weeks.length * 12 + weeks.length * 2}px` }}>
                    {monthPositions.map((mp, i) => {
                        const nextCol = i < monthPositions.length - 1 ? (monthPositions[i + 1]?.col ?? weeks.length) : weeks.length;
                        const widthCols = nextCol - mp.col;
                        return (
                            <div
                                key={`${mp.label}-${mp.col}`}
                                className="text-[10px] text-neutral-400"
                                style={{ width: `${widthCols * 14}px`, flexShrink: 0 }}
                            >
                                {mp.label}
                            </div>
                        );
                    })}
                </div>
                {/* ヒートマップグリッド（週ごとの列 × 7日の行） */}
                <div className="mt-1 flex gap-[2px]" style={{ minWidth: `${weeks.length * 14}px` }}>
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[2px]">
                            {week.map((date) => (
                                <div
                                    key={date}
                                    className={`h-[10px] w-[10px] rounded-sm ${getCellColor(heatmapData[date] || 0)}`}
                                    title={`${date}${heatmapData[date] ? ` (${heatmapData[date]}回)` : ''}`}
                                />
                            ))}
                            {/* 週が7日未満の場合の埋め合わせ */}
                            {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                                <div key={`pad-${i}`} className="h-[10px] w-[10px]" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            {/* 凡例 */}
            <div className="mt-3 flex items-center justify-between">
                <p className="text-[10px] text-neutral-400">過去1年間の出席記録</p>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">少ない</span>
                    <div className="h-[10px] w-[10px] rounded-sm bg-neutral-100" />
                    <div className="h-[10px] w-[10px] rounded-sm bg-neutral-300" />
                    <div className="h-[10px] w-[10px] rounded-sm bg-neutral-500" />
                    <div className="h-[10px] w-[10px] rounded-sm bg-neutral-900" />
                    <span className="text-[10px] text-neutral-400">多い</span>
                </div>
            </div>
        </div>
    );
}
