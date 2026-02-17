'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import { addGuest, getActiveGuests, deactivateGuest } from '@/lib/actions/guest.actions';
import type { Guest } from '@/lib/types/models';

export default function GuestsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [g, role] = await Promise.all([
      getActiveGuests(circleId),
      getCurrentUserRole(circleId, user.uid),
    ]);

    if (role !== 'organizer') {
      router.push(`/circles/${circleId}`);
      return;
    }

    setGuests(g.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    setIsOrganizer(role === 'organizer');
    setLoading(false);
  }, [circleId, user, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSubmitting(true);
    try {
      await addGuest(
        circleId,
        {
          name: name.trim(),
          email: email.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
          notes: notes.trim() || undefined
        },
        user.uid
      );
      toast.success(`${name}さんを追加しました`);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (guestId: string, guestName: string) => {
    if (!user) return;
    try {
      await deactivateGuest(circleId, guestId, user.uid);
      toast.success(`${guestName}さんを削除しました`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-50" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            👤 ゲスト管理
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            ログイン不要の参加者を管理します（新歓など）
          </p>
        </div>
        {isOrganizer && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            ゲスト追加
          </button>
        )}
      </div>

      {/* Guest list */}
      {guests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-14 text-center">
          <p className="text-3xl">👤</p>
          <div>
            <p className="text-sm font-medium">ゲストがいません</p>
            {isOrganizer && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                ゲスト追加ボタンから登録できます
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-[12px] text-muted-foreground">
            登録ゲスト（{guests.length}人）
          </p>
          <div className="divide-y border-y">
            {guests.map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.name}</p>
                  {(g.email || g.phoneNumber) && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {g.email || g.phoneNumber}
                    </p>
                  )}
                  {g.notes && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {g.notes}
                    </p>
                  )}
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => handleRemove(g.id, g.name)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-red-600"
                    title="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add guest dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-md border bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">ゲストを追加</h2>
            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="guest-name" className="text-[13px] font-medium">
                  名前 *
                </label>
                <input
                  id="guest-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：田中太郎"
                  required
                  maxLength={50}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] transition-colors focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="guest-email" className="text-[13px] font-medium">
                  メールアドレス
                </label>
                <input
                  id="guest-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] transition-colors focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="guest-phone" className="text-[13px] font-medium">
                  電話番号
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="090-1234-5678"
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] transition-colors focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="guest-notes" className="text-[13px] font-medium">
                  メモ
                </label>
                <input
                  id="guest-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="例：〇〇さんの友人"
                  maxLength={100}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] transition-colors focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
                >
                  {submitting ? '追加中...' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
