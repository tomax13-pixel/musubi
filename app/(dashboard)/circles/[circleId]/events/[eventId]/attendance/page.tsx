'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircleMembers, getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getActiveGuests } from '@/lib/actions/guest.actions';
import { recordAttendance, getAttendanceForEvent, type AttendeeInput } from '@/lib/actions/attendance.actions';
import { getEvent } from '@/lib/actions/event.actions';
import type { CircleMember, Guest, AttendanceRecord, Event } from '@/lib/types/models';

interface AttendeeRow {
  id: string;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  isGuest: boolean;
  uid?: string;
  guestId?: string;
  attended: boolean;
}

export default function AttendancePage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const eventId = params['eventId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const role = await getCurrentUserRole(circleId, user.uid);
    if (role !== 'organizer') {
      router.push(`/circles/${circleId}/events/${eventId}`);
      return;
    }

    const [members, guests, existing, evt] = await Promise.all([
      getCircleMembers(circleId),
      getActiveGuests(circleId),
      getAttendanceForEvent(circleId, eventId),
      getEvent(circleId, eventId),
    ]);

    setEvent(evt);

    const existingMap = new Map<string, AttendanceRecord>(
      existing.map((r) => [r.id, r])
    );

    const rows: AttendeeRow[] = [
      ...members.map((m: CircleMember): AttendeeRow => ({
        id: m.uid,
        displayName: m.displayName,
        email: m.email,
        photoURL: m.photoURL,
        isGuest: false,
        uid: m.uid,
        attended: existingMap.get(m.uid)?.attended ?? false,
      })),
      ...guests.map((g: Guest): AttendeeRow => ({
        id: g.id,
        displayName: g.name,
        email: g.email,
        isGuest: true,
        guestId: g.id,
        attended: existingMap.get(g.id)?.attended ?? false,
      })),
    ];

    setAttendees(rows);
    setLoading(false);
  }, [circleId, eventId, user, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleAttendance = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) => a.id === id ? { ...a, attended: !a.attended } : a)
    );
  };

  const selectAll = () => setAttendees((prev) => prev.map((a) => ({ ...a, attended: true })));
  const clearAll = () => setAttendees((prev) => prev.map((a) => ({ ...a, attended: false })));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const inputs: AttendeeInput[] = attendees.map((a) => ({
        id: a.id,
        isGuest: a.isGuest,
        attended: a.attended,
        displayName: a.displayName,
        email: a.email,
        photoURL: a.photoURL,
        uid: a.uid,
        guestId: a.guestId,
      }));
      await recordAttendance(circleId, eventId, inputs, user.uid);
      toast.success('出欠を記録しました。支払い記録が自動生成されました。');
      router.push(`/circles/${circleId}/events/${eventId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const attendedCount = attendees.filter((a) => a.attended).length;

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded bg-neutral-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">✏️ 出欠記録</h1>
          {event && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{event.name}</p>
          )}
        </div>
        <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-[12px] font-medium tabular-nums">
          {attendedCount} / {attendees.length}
        </span>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">参加者リスト</p>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-[12px] text-muted-foreground hover:text-foreground">全選択</button>
            <button onClick={clearAll} className="text-[12px] text-muted-foreground hover:text-foreground">クリア</button>
          </div>
        </div>

        {attendees.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center">
            <p className="text-[13px] text-muted-foreground">
              メンバーがいません。メンバーを追加するか、ゲストを登録してください。
            </p>
          </div>
        ) : (
          <div className="divide-y border-y">
            {attendees.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <Checkbox
                  checked={a.attended}
                  onCheckedChange={() => toggleAttendance(a.id)}
                />
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-sm font-medium">{a.displayName}</span>
                  {a.isGuest && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ゲスト</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t pt-6">
        <button
          onClick={() => router.back()}
          className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          {saving ? '保存中...' : `出欠を記録（${attendedCount}人参加）`}
        </button>
      </div>
    </div>
  );
}
