'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Check, RotateCcw } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRoleAdmin, getPaymentsForEventAdmin, markAsPaidAdmin, confirmPaymentAdmin, resetPaymentAdmin, getEventAdmin } from '@/lib/actions/admin.actions';
import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import type { PaymentRecord, Event } from '@/lib/types/models';
import { formatAmount } from '@/lib/utils/date';
import { showGamificationToast } from '@/components/gamification/GamificationToast';

export default function PaymentsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const eventId = params['eventId'] as string;
  const { user } = useAuthContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [evt, pmts, role] = await Promise.all([
      getEventAdmin(circleId, eventId),
      getPaymentsForEventAdmin(circleId, eventId),
      getCurrentUserRoleAdmin(circleId, user.uid),
    ]);
    setEvent(evt as any);
    setPayments((pmts as any[]).sort((a: any, b: any) => {
      const order: Record<string, number> = { unpaid: 0, pending_confirmation: 1, confirmed: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    }));
    setIsOrganizer(role === 'organizer');
    setLoading(false);
  }, [circleId, eventId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAsPaid = async (paymentId: string) => {
    if (!user) return;
    setActionLoading(paymentId);
    try {
      await markAsPaidAdmin(circleId, eventId, user.uid);
      toast.success('支払い済みとしてマークしました');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (paymentId: string) => {
    if (!user) return;
    setActionLoading(paymentId);
    try {
      const confirmResult = await confirmPaymentAdmin(circleId, eventId, paymentId, user.uid);
      toast.success('支払いを確認しました');
      if (confirmResult?.gamification) {
        showGamificationToast(confirmResult.gamification);
      }
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (paymentId: string) => {
    if (!user) return;
    setActionLoading(paymentId);
    try {
      await resetPaymentAdmin(circleId, eventId, paymentId, user.uid);
      toast.success('未払いにリセットしました');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async (payment: PaymentRecord) => {
    if (!payment.uid || !event) return;
    setActionLoading(`remind-${payment.id}`);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientUid: payment.uid,
          title: '支払いのリマインダー',
          body: `${event.name}の参加費（${formatAmount(payment.amount)}）のお支払いをお願いします。`,
          circleId,
          eventId,
        }),
      });
      if (!res.ok) throw new Error('送信に失敗しました');
      toast.success(`${payment.displayName}さんにリマインダーを送信しました`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-neutral-50" />)}
    </div>;
  }

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const confirmed = payments.filter((p) => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">💰 集金状況</h1>
        {event && <p className="mt-0.5 text-[13px] text-muted-foreground">{event.name}</p>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-neutral-100 sm:grid-cols-4">
        <div className="bg-white p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">参加者</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{payments.length}人</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">目標</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatAmount(total)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">確認済み</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatAmount(confirmed)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">未集金</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatAmount(total - confirmed)}</p>
        </div>
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center">
          <p className="text-[13px] text-muted-foreground">まず出欠を記録してください</p>
        </div>
      ) : (
        <div className="divide-y border-y">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{payment.displayName}</span>
                  {payment.isGuest && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ゲスト</span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground tabular-nums">{formatAmount(payment.amount)}</p>
              </div>

              <PaymentStatusBadge status={payment.status} />

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {!isOrganizer && user?.uid === payment.uid && payment.status === 'unpaid' && (
                  <button
                    disabled={actionLoading === payment.id}
                    onClick={() => handleMarkAsPaid(payment.id)}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
                  >
                    支払済みにする
                  </button>
                )}

                {isOrganizer && (
                  <>
                    {payment.status === 'pending_confirmation' && (
                      <button
                        disabled={actionLoading === payment.id}
                        onClick={() => handleConfirm(payment.id)}
                        className="flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[12px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
                      >
                        <Check className="h-3 w-3" strokeWidth={1.5} />
                        確認
                      </button>
                    )}

                    {payment.status === 'unpaid' && (
                      <button
                        disabled={actionLoading === payment.id}
                        onClick={() => handleConfirm(payment.id)}
                        className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
                      >
                        <Check className="h-3 w-3" strokeWidth={1.5} />
                        受領
                      </button>
                    )}

                    {payment.status === 'confirmed' && (
                      <button
                        disabled={actionLoading === payment.id}
                        onClick={() => handleReset(payment.id)}
                        title="未払いにリセット"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}

                    {payment.status !== 'confirmed' && !payment.isGuest && payment.uid && (
                      <button
                        disabled={actionLoading === `remind-${payment.id}`}
                        onClick={() => handleSendReminder(payment)}
                        title="リマインダーを送信"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:opacity-40"
                      >
                        <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
