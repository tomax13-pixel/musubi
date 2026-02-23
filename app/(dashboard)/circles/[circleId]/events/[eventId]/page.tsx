'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, MapPin, QrCode } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getEvent } from '@/lib/actions/event.actions';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getPaymentsForEvent } from '@/lib/actions/payment.actions';
import type { Event, PaymentRecord } from '@/lib/types/models';
import { formatDate, formatAmount } from '@/lib/utils/date';
import { PAYMENT_STATUS_CONFIG } from '@/lib/constants/paymentStatus';
import { SendNotificationPanel } from '@/components/notifications/SendNotificationPanel';

export default function EventDetailPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const eventId = params['eventId'] as string;
  const { user } = useAuthContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getEvent(circleId, eventId),
      getPaymentsForEvent(circleId, eventId),
      getCurrentUserRole(circleId, user.uid),
    ]).then(([e, p, role]) => {
      setEvent(e);
      setPayments(p);
      setIsOrganizer(role === 'organizer');
    }).finally(() => setLoading(false));
  }, [circleId, eventId, user]);

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
    </div>;
  }

  if (!event) return <p className="text-muted-foreground">イベントが見つかりません</p>;

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const confirmed = payments.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);
  const unpaidCount = payments.filter((p) => p.status === 'unpaid').length;

  return (
    <div className="space-y-8">
      {/* Event header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
            {formatDate(event.date)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {event.location}
            </span>
          )}
          <span>💰 {formatAmount(event.fee)}</span>
        </div>
        {event.description && (
          <p className="mt-3 text-[13px] text-muted-foreground">{event.description}</p>
        )}
      </div>

      {/* Quick stats */}
      {payments.length > 0 && (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-neutral-100">
          <div className="bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">参加者</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{payments.length}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">集金済み</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatAmount(confirmed)}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">未払い</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{unpaidCount}人</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {isOrganizer && (
          <Link
            href={`/circles/${circleId}/events/${eventId}/checkin`}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
          >
            <QrCode className="h-3.5 w-3.5" />
            QRチェックイン
          </Link>
        )}
        {isOrganizer && (
          <Link
            href={`/circles/${circleId}/events/${eventId}/attendance`}
            className="rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
          >
            ✏️ 出欠を記録
          </Link>
        )}
        <Link
          href={`/circles/${circleId}/events/${eventId}/payments`}
          className="rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
        >
          💰 集金状況を見る
        </Link>
      </div>

      {/* Recent payments preview */}
      {payments.length > 0 && (
        <div>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            集金状況
          </h2>
          <div className="divide-y border-y">
            {payments.slice(0, 5).map((p) => {
              const config = PAYMENT_STATUS_CONFIG[p.status];
              return (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">{p.displayName}</span>
                  <span className={`text-[12px] ${config.color}`}>
                    {config.emoji} {config.label}
                  </span>
                </div>
              );
            })}
          </div>
          {payments.length > 5 && (
            <Link
              href={`/circles/${circleId}/events/${eventId}/payments`}
              className="mt-2 block text-center text-[13px] text-muted-foreground hover:text-foreground"
            >
              すべて見る（{payments.length}件）→
            </Link>
          )}
        </div>
      )}

      {/* 通知送信パネル（幹事のみ） */}
      {isOrganizer && user && (
        <SendNotificationPanel
          circleId={circleId}
          eventId={eventId}
          eventName={event.name}
          currentUserUid={user.uid}
        />
      )}
    </div>
  );
}
