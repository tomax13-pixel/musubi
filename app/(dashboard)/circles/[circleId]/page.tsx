'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Calendar } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircle, getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getEventsForCircle } from '@/lib/actions/event.actions';
import type { Circle, Event } from '@/lib/types/models';
import { formatDate, formatAmount } from '@/lib/utils/date';

export default function CircleDetailPage() {
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
      setEvents(e);
      setIsOrganizer(role === 'organizer');
    }).finally(() => setLoading(false));
  }, [circleId, user]);

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-50" />
    </div>;
  }

  if (!circle) return <p className="text-muted-foreground">サークルが見つかりません</p>;

  return (
    <div className="space-y-8">
      {/* Circle header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{circle.emoji || '📌'}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{circle.name}</h1>
            {circle.description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{circle.description}</p>
            )}
          </div>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <Link
              href={`/circles/${circleId}/guests`}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-neutral-50"
            >
              👤 ゲスト管理
            </Link>
          </div>
        )}
      </div>

      {/* Events section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            📅 イベント
          </h2>
          {isOrganizer && (
            <Link
              href={`/circles/${circleId}/events/create`}
              className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              新規作成
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-14 text-center">
            <p className="text-3xl">📅</p>
            <div>
              <p className="text-sm font-medium">イベントがありません</p>
              {isOrganizer && (
                <p className="mt-1 text-[13px] text-muted-foreground">最初のイベントを作成しましょう</p>
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
          <div className="divide-y border-t">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/circles/${circleId}/events/${event.id}`}
                className="flex items-center gap-4 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{event.name}</p>
                  <p className="mt-0.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" strokeWidth={1.5} />
                      {formatDate(event.date)}
                    </span>
                    {event.location && <span>{event.location}</span>}
                  </p>
                </div>
                <span className="text-[13px] font-medium tabular-nums">
                  {formatAmount(event.fee)}
                </span>
                <span className="text-[12px] text-muted-foreground">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
