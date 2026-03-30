'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Check, ChevronDown, RotateCcw, CheckCheck } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRoleAdmin, getPaymentsForEventAdmin, markAsPaidAdmin, confirmPaymentAdmin, resetPaymentAdmin, getEventAdmin } from '@/lib/actions/admin.actions';
import { getDrinkMenu } from '@/lib/actions/drinkMenu.actions';
import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import { PaymentItemList } from '@/components/payments/PaymentItemList';
import type { PaymentRecord, PaymentStatus, Event, DrinkMenuItem } from '@/lib/types/models';
import { formatAmount } from '@/lib/utils/date';
import { showGamificationToast } from '@/components/gamification/GamificationToast';

export default function PaymentsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const eventId = params['eventId'] as string;
  const { user } = useAuthContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [drinkMenu, setDrinkMenu] = useState<DrinkMenuItem[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [confirmingAll, setConfirmingAll] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [evt, pmts, role, menu] = await Promise.all([
      getEventAdmin(circleId, eventId),
      getPaymentsForEventAdmin(circleId, eventId),
      getCurrentUserRoleAdmin(circleId, user.uid),
      getDrinkMenu(circleId),
    ]);
    setEvent(evt as any);
    setPayments((pmts as any[]).sort((a: any, b: any) => {
      const order: Record<string, number> = { unpaid: 0, pending_confirmation: 1, confirmed: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    }));
    setIsOrganizer(role === 'organizer');
    setDrinkMenu(menu);
    // Default view: members see their own tab, organizers see all
    if (role !== 'organizer') setViewMode('my');
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-neutral-50" />)}
    </div>;
  }

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const confirmed = payments.filter((p) => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const progressPercent = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  // Group payments by status
  const groups: { status: PaymentStatus; label: string; payments: PaymentRecord[] }[] = [
    { status: 'unpaid', label: '未払い', payments: payments.filter((p) => p.status === 'unpaid') },
    { status: 'pending_confirmation', label: '確認待ち', payments: payments.filter((p) => p.status === 'pending_confirmation') },
    { status: 'confirmed', label: '確認済み', payments: payments.filter((p) => p.status === 'confirmed') },
  ];

  // My payment
  const myPayment = user ? payments.find((p) => p.uid === user.uid) : null;

  // Batch confirm
  const handleConfirmAll = async () => {
    if (!user) return;
    setConfirmingAll(true);
    try {
      const pending = payments.filter((p) => p.status === 'pending_confirmation');
      for (const p of pending) {
        await confirmPaymentAdmin(circleId, eventId, p.id, user.uid);
      }
      toast.success(`${pending.length}件の支払いを確認しました`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setConfirmingAll(false);
    }
  };

  const renderPaymentRow = (payment: PaymentRecord) => {
    const isExpanded = expandedId === payment.id;
    const drinksTotal = (payment.items ?? []).reduce((s, i) => s + i.price, 0);
    const canEdit = isOrganizer || (!!user && user.uid === payment.uid);

    return (
      <div key={payment.id} className="py-3">
        <div
          className="flex cursor-pointer items-center gap-3"
          onClick={() => toggleExpand(payment.id)}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{payment.displayName}</span>
              {payment.isGuest && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ゲスト</span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground tabular-nums">
              {drinksTotal > 0
                ? `${formatAmount(payment.baseFee)} + ドリンク ${formatAmount(drinksTotal)} = ${formatAmount(payment.amount)}`
                : formatAmount(payment.amount)
              }
            </p>
          </div>

          <PaymentStatusBadge status={payment.status} />
        </div>

        {/* Expanded: items + actions */}
        {isExpanded && user && (
          <div className="ml-7 mt-2 space-y-3">
            <PaymentItemList
              circleId={circleId}
              eventId={eventId}
              paymentId={payment.id}
              baseFee={payment.baseFee ?? payment.amount}
              items={payment.items ?? []}
              canEdit={canEdit}
              isOrganizer={isOrganizer}
              currentUserUid={user.uid}
              onItemsChanged={loadData}
              drinkMenu={drinkMenu}
            />

            {/* Action buttons inside expanded area */}
            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {!isOrganizer && user.uid === payment.uid && payment.status === 'unpaid' && (
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
                      className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                      リセット
                    </button>
                  )}

                  {payment.status !== 'confirmed' && !payment.isGuest && payment.uid && (
                    <button
                      disabled={actionLoading === `remind-${payment.id}`}
                      onClick={() => handleSendReminder(payment)}
                      className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <Bell className="h-3 w-3" strokeWidth={1.5} />
                      リマインダー
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">💰 集金状況</h1>
        {event && <p className="mt-0.5 text-[13px] text-muted-foreground">{event.name}</p>}
      </div>

      {/* Progress bar */}
      {payments.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>集金進捗</span>
            <span className="tabular-nums">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

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

      {/* View toggle */}
      {payments.length > 0 && myPayment && (
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              viewMode === 'all' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            全員
          </button>
          <button
            onClick={() => setViewMode('my')}
            className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              viewMode === 'my' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            自分の会計
          </button>
        </div>
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center">
          <p className="text-[13px] text-muted-foreground">まず出欠を記録してください</p>
        </div>
      ) : viewMode === 'my' && myPayment ? (
        /* My tab view */
        <div className="divide-y border-y">
          {renderPaymentRow(myPayment)}
        </div>
      ) : (
        /* Grouped view */
        <div className="space-y-4">
          {groups.map((group) => {
            if (group.payments.length === 0) return null;
            const defaultOpen = group.status !== 'confirmed';

            return (
              <StatusGroup
                key={group.status}
                label={group.label}
                count={group.payments.length}
                defaultOpen={defaultOpen}
                headerAction={
                  isOrganizer && group.status === 'pending_confirmation' && group.payments.length > 1 ? (
                    <button
                      disabled={confirmingAll}
                      onClick={handleConfirmAll}
                      className="flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
                    >
                      <CheckCheck className="h-3 w-3" strokeWidth={1.5} />
                      全て確認
                    </button>
                  ) : undefined
                }
              >
                <div className="divide-y">
                  {group.payments.map(renderPaymentRow)}
                </div>
              </StatusGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Collapsible status group */
function StatusGroup({
  label,
  count,
  defaultOpen,
  headerAction,
  children,
}: {
  label: string;
  count: number;
  defaultOpen: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-neutral-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
          strokeWidth={1.5}
        />
        <span className="text-[13px] font-medium">{label}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {count}
        </span>
        <span className="flex-1" />
        {headerAction && <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>}
      </button>
      {open && <div className="border-t px-4">{children}</div>}
    </div>
  );
}
