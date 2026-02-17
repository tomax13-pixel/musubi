'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Calendar, MapPin } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircle, getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getEventsForCircle } from '@/lib/actions/event.actions';
import type { Circle, Event } from '@/lib/types/models';
import { formatDate, formatAmount } from '@/lib/utils/date';

export default function EventsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getCircle(circleId),
      getEventsForCircle(circleId),
      getCurrentUserRole(circleId, user.uid),
    ]).then(([c, e, role]) => {
      setCircle(c);
      // Sort by date descending (newest first)
      const sorted = e.sort((a, b) => {
        const timeA = a.date?.toMillis?.() ?? 0;
        const timeB = b.date?.toMillis?.() ?? 0;
        return timeB - timeA;
      });
      setEvents(sorted);
      setIsOrganizer(role === 'organizer');
    }).finally(() => setLoading(false));
  }, [circleId, user]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            📅 イベント一覧
          </h1>
          {circle && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {circle.emoji} {circle.name}
            </p>
          )}
        </div>
        {isOrganizer && (
          <Link
            href={`/circles/${circleId}/events/create`}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            新規作成
          </Link>
        )}
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-14 text-center">
          <p className="text-3xl">📅</p>
          <div>
            <p className="text-sm font-medium">イベントがありません</p>
            {isOrganizer && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                最初のイベントを作成しましょう
              </p>
            )}
          </div>
          {isOrganizer && (
            <Link
              href={`/circles/${circleId}/events/create`}
              className="rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
            >
              イベント作成
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/circles/${circleId}/events/${event.id}`}
              className="flex items-center gap-4 rounded-md border border-transparent px-3 py-3 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{event.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" strokeWidth={1.5} />
                    {formatDate(event.date)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[13px] font-medium tabular-nums">
                  {formatAmount(event.fee)}
                </span>
                <span className="text-[12px] text-muted-foreground">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="border-t pt-6">
        <Link
          href={`/circles/${circleId}`}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← サークルに戻る
        </Link>
      </div>
    </div>
  );
}
