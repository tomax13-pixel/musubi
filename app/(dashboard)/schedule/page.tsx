'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { CircleIcon } from '@/components/circles/CircleIcon';
import { getCirclesForUser } from '@/lib/actions/circle.actions';
import { getEventsForCircle } from '@/lib/actions/event.actions';
import { EventCalendar } from '@/components/events/EventCalendar';
import type { Circle, Event } from '@/lib/types/models';
import { motion } from 'framer-motion';

export default function SchedulePage() {
  const { user } = useAuthContext();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [allEvents, setAllEvents] = useState<(Event & { circleId: string; circleEmoji: string; circleName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    getCirclesForUser(user.uid).then(async (circles) => {
      setCircles(circles);
      const eventsPerCircle = await Promise.all(
        circles.map(async (circle) => {
          const events = await getEventsForCircle(circle.id);
          return events.map((e) => ({
            ...e,
            circleId: circle.id,
            circleEmoji: circle.emoji || '📌',
            circleName: circle.name,
          }));
        })
      );
      setAllEvents(eventsPerCircle.flat());
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-neutral-100" />
        <div className="h-80 animate-pulse rounded-lg bg-neutral-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">📅 予定</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          すべてのサークルのイベント
        </p>
      </div>

      {circles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-200 py-16 text-center bg-neutral-50/50"
        >
          <div className="relative h-32 w-48">
            <Image
              src="/assets/illustrations/empty_events.png"
              alt="予定はありません"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 192px, 192px"
            />
          </div>
          <div>
            <p className="text-[15px] font-medium">お探しの予定はありません</p>
            <p className="mt-1 text-[13px] text-muted-foreground">サークルに参加するとイベントがここに表示されます</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {circles.map((circle) => {
            const circleEvents = allEvents.filter((e) => e.circleId === circle.id);
            if (circleEvents.length === 0) return null;
            return (
              <div key={circle.id}>
                <h2 className="mb-3 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <CircleIcon emoji={circle.emoji} size={16} />
                  {circle.name}
                </h2>
                <EventCalendar events={circleEvents} circleId={circle.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
