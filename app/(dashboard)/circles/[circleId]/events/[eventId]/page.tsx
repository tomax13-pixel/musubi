'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, MoreHorizontal, Pencil, Trash2, QrCode, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getEvent } from '@/lib/actions/event.actions';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getPaymentsForEvent } from '@/lib/actions/payment.actions';
import { updateEventAdmin, deleteEventAdmin, respondAttendanceAdmin, getMyAttendanceAdmin } from '@/lib/actions/admin.actions';
import type { Event, PaymentRecord } from '@/lib/types/models';
import { formatDate, formatAmount } from '@/lib/utils/date';
import { PAYMENT_STATUS_CONFIG } from '@/lib/constants/paymentStatus';
import { showGamificationToast } from '@/components/gamification/GamificationToast';
import { SendNotificationPanel } from '@/components/notifications/SendNotificationPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function EventDetailPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const eventId = params['eventId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFee, setEditFee] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Attendance response state
  const [myAttendance, setMyAttendance] = useState<boolean | null>(null);
  const [respondingAttendance, setRespondingAttendance] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [e, p, role] = await Promise.all([
      getEvent(circleId, eventId),
      getPaymentsForEvent(circleId, eventId),
      getCurrentUserRole(circleId, user.uid),
    ]);
    setEvent(e);
    setPayments(p);
    setIsOrganizer(role === 'organizer');

    // Load my attendance
    const att = await getMyAttendanceAdmin(circleId, eventId, user.uid);
    if (att) {
      setMyAttendance(att.attended ?? null);
    } else {
      setMyAttendance(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, eventId, user]);

  const openEditDialog = () => {
    if (!event) return;
    setEditName(event.name);
    setEditDescription(event.description || '');
    const d = typeof event.date === 'string' ? event.date : event.date?.toDate?.()?.toISOString?.();
    setEditDate(d ? d.slice(0, 16) : '');
    setEditLocation(event.location || '');
    setEditFee(event.fee || 0);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!user) return;
    setEditSaving(true);
    try {
      await updateEventAdmin(circleId, eventId, {
        name: editName.trim(),
        description: editDescription.trim(),
        date: new Date(editDate).toISOString(),
        location: editLocation.trim(),
        fee: editFee,
      }, user.uid);
      toast.success('イベントを更新しました');
      setEditOpen(false);
      // Reload data
      const e = await getEvent(circleId, eventId);
      setEvent(e);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteEventAdmin(circleId, eventId, user.uid);
      toast.success('イベントを削除しました');
      router.push(`/circles/${circleId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
      setDeleting(false);
    }
  };

  const handleRespondAttendance = async (response: 'attend' | 'absent') => {
    if (!user) return;
    setRespondingAttendance(true);
    try {
      const result = await respondAttendanceAdmin(
        circleId,
        eventId,
        user.uid,
        response,
        user.displayName ?? '名前未設定',
        user.email ?? undefined,
        user.photoURL
      );
      setMyAttendance(response === 'attend');
      toast.success(response === 'attend' ? '参加で回答しました' : '不参加で回答しました');
      if (response === 'attend' && result?.gamification) {
        showGamificationToast(result.gamification);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '回答に失敗しました');
    } finally {
      setRespondingAttendance(false);
    }
  };

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
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          {isOrganizer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openEditDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  イベントを編集
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/events/${eventId}/attendance`}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    出欠を記録
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/events/${eventId}/checkin`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    QRチェックイン
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  イベントを削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
          {event.fee > 0 && <span>{formatAmount(event.fee)}</span>}
        </div>
        {event.description && (
          <p className="mt-3 text-[13px] text-muted-foreground">{event.description}</p>
        )}
      </div>

      {/* Attendance response (for all members) */}
      <div className="rounded-md border border-neutral-200 p-4">
        <p className="mb-3 text-[13px] font-medium">あなたの出欠</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleRespondAttendance('attend')}
            disabled={respondingAttendance}
            className={`flex-1 rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
              myAttendance === true
                ? 'bg-foreground text-background'
                : 'border border-neutral-200 hover:bg-neutral-50'
            } disabled:opacity-40`}
          >
            {myAttendance === true ? '⭕ 参加' : '参加する'}
          </button>
          <button
            onClick={() => handleRespondAttendance('absent')}
            disabled={respondingAttendance}
            className={`flex-1 rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
              myAttendance === false
                ? 'bg-foreground text-background'
                : 'border border-neutral-200 hover:bg-neutral-50'
            } disabled:opacity-40`}
          >
            {myAttendance === false ? '❌ 不参加' : '不参加'}
          </button>
        </div>
        {myAttendance === null && (
          <p className="mt-2 text-[11px] text-muted-foreground">まだ回答していません</p>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>イベントを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">イベント名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">日時</Label>
              <Input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
                className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">場所</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">参加費（円）</Label>
              <Input
                type="number"
                value={editFee}
                onChange={(e) => setEditFee(Number(e.target.value))}
                min={0}
                className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">説明</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="flex gap-3 border-t pt-4">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editName.trim() || !editDate}
                className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>イベントを削除</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-[13px] text-muted-foreground">
              「{event.name}」を削除しますか？出欠記録・支払い記録もすべて削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3 border-t pt-4">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
