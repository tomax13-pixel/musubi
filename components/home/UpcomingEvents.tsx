'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { CircleIcon } from '@/components/circles/CircleIcon';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface UpcomingEvent {
  id: string;
  circleId: string;
  circleName: string;
  circleEmoji: string;
  name: string;
  date: string;
  location?: string;
  fee?: number;
  myAttendance: boolean | null;
}

function AttendanceBadge({ status }: { status: boolean | null }) {
  if (status === true) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">⭕ 参加</span>;
  }
  if (status === false) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-400">❌ 不参加</span>;
  }
  return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">未回答</span>;
}

export function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-8 text-center">
        <span className="text-2xl">📅</span>
        <p className="text-[13px] text-muted-foreground">今後のイベントはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {events.map((event, i) => {
        const eventDate = new Date(event.date);
        const isToday = new Date().toDateString() === eventDate.toDateString();
        const day = format(eventDate, 'M/d(E)', { locale: ja });
        const time = format(eventDate, 'HH:mm');

        return (
          <motion.div
            key={`${event.circleId}-${event.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={`/circles/${event.circleId}/events/${event.id}`}
              className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-3.5 py-3 transition-all hover:border-neutral-200 hover:shadow-sm active:scale-[0.99]"
            >
              {/* Date badge */}
              <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${
                isToday ? 'bg-foreground text-background' : 'bg-neutral-50'
              }`}>
                <span className={`text-[10px] font-medium leading-none ${isToday ? '' : 'text-muted-foreground'}`}>
                  {format(eventDate, 'M/d')}
                </span>
                <span className={`mt-0.5 text-[10px] leading-none ${isToday ? '' : 'text-muted-foreground'}`}>
                  {format(eventDate, 'E', { locale: ja })}
                </span>
              </div>

              {/* Event info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CircleIcon emoji={event.circleEmoji} size={16} />
                  <p className="truncate text-[13px] font-medium">{event.name}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{time}</span>
                  {event.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {event.location}
                    </span>
                  )}
                  {event.fee && event.fee > 0 && (
                    <span>¥{event.fee.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Attendance status */}
              <div className="shrink-0">
                <AttendanceBadge status={event.myAttendance} />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
