'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Event } from '@/lib/types/models';
import { toDate, formatAmount } from '@/lib/utils/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface EventCalendarProps {
    events: Event[];
    circleId: string;
}

export function EventCalendar({ events, circleId }: EventCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // イベントを日付ごとにグループ化
    const eventsByDate = useMemo(() => {
        const map = new Map<string, Event[]>();
        events.forEach((event) => {
            const date = toDate(event.date);
            if (!date) return;
            const key = format(date, 'yyyy-MM-dd');
            const existing = map.get(key) || [];
            existing.push(event);
            map.set(key, existing);
        });
        return map;
    }, [events]);

    // カレンダーのマス目を生成
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const days: Date[] = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // 選択された日のイベント
    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        const key = format(selectedDate, 'yyyy-MM-dd');
        return eventsByDate.get(key) || [];
    }, [selectedDate, eventsByDate]);

    // 今月のイベント数
    const eventsThisMonth = useMemo(() => {
        return events.filter((event) => {
            const date = toDate(event.date);
            if (!date) return false;
            return isSameMonth(date, currentMonth);
        }).length;
    }, [events, currentMonth]);

    return (
        <div className="space-y-4">
            {/* カレンダーヘッダー */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold tracking-tight">
                        {format(currentMonth, 'yyyy年M月', { locale: ja })}
                    </h3>
                    <span className="text-[12px] text-muted-foreground">
                        {eventsThisMonth}件のイベント
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-neutral-50"
                    >
                        今月
                    </button>
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                    >
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                    >
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* カレンダー本体 */}
            <div className="overflow-hidden rounded-lg border border-neutral-200">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50">
                    {WEEKDAYS.map((day, i) => (
                        <div
                            key={day}
                            className={`py-2 text-center text-[11px] font-medium tracking-wider ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted-foreground'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* 日付グリッド */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((day, idx) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDate.get(dateKey) || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const dayOfWeek = day.getDay();

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(isSelected ? null : day)}
                                className={`
                  relative flex min-h-[56px] flex-col items-center gap-0.5 border-b border-r border-neutral-100 px-1 py-1.5
                  transition-colors
                  ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                `}
                            >
                                <span
                                    className={`
                    flex h-6 w-6 items-center justify-center rounded-full text-[12px]
                    ${isTodayDate ? 'bg-black font-bold text-white' : 'font-medium'}
                    ${!isTodayDate && dayOfWeek === 0 ? 'text-red-400' : ''}
                    ${!isTodayDate && dayOfWeek === 6 ? 'text-blue-400' : ''}
                  `}
                                >
                                    {format(day, 'd')}
                                </span>
                                {/* イベントドット */}
                                {dayEvents.length > 0 && (
                                    <div className="flex items-center gap-0.5">
                                        {dayEvents.slice(0, 3).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-1.5 w-1.5 rounded-full bg-black"
                                            />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[9px] text-muted-foreground">+</span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 選択した日のイベント詳細 */}
            {selectedDate && (
                <div className="rounded-lg border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-100 px-4 py-2.5">
                        <p className="text-[13px] font-medium">
                            {format(selectedDate, 'M月d日(E)', { locale: ja })}
                            <span className="ml-2 text-muted-foreground">
                                {selectedDateEvents.length === 0
                                    ? 'イベントなし'
                                    : `${selectedDateEvents.length}件`}
                            </span>
                        </p>
                    </div>
                    {selectedDateEvents.length > 0 ? (
                        <div className="divide-y divide-neutral-100">
                            {selectedDateEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/circles/${circleId}/events/${event.id}`}
                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">
                                        <Calendar className="h-4 w-4 text-neutral-600" strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{event.name}</p>
                                        <p className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                                            {event.location && (
                                                <span className="flex items-center gap-0.5">
                                                    <MapPin className="h-3 w-3" strokeWidth={1.5} />
                                                    {event.location}
                                                </span>
                                            )}
                                            <span>💰 {formatAmount(event.fee)}</span>
                                        </p>
                                    </div>
                                    <span className="text-[12px] text-muted-foreground">→</span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                            この日にイベントはありません
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
