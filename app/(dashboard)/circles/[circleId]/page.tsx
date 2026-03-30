'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, LogOut, Settings, MoreHorizontal, Users, Calendar, Vote } from 'lucide-react';
import { motion } from 'framer-motion';
import { CircleIcon } from '@/components/circles/CircleIcon';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCircle, getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getEventsForCircle } from '@/lib/actions/event.actions';
import { getPollsForCircle } from '@/lib/actions/poll.actions';
import { leaveCircleAdmin, getCircleMembersAdmin, updateCircleAdmin } from '@/lib/actions/admin.actions';
import { CircleIconPicker } from '@/components/circles/CircleIconPicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Circle, Event } from '@/lib/types/models';
import { formatDate, formatAmount } from '@/lib/utils/date';
import { InviteLinkButton } from '@/components/circles/InviteLinkButton';
import { EventCalendar } from '@/components/events/EventCalendar';
import { CircleLeaderboard } from '@/components/gamification/CircleLeaderboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function CircleDetailPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isLastOrganizer, setIsLastOrganizer] = useState(false);

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getCircle(circleId),
      getEventsForCircle(circleId),
      getCurrentUserRole(circleId, user.uid),
      getPollsForCircle(circleId),
      getCircleMembersAdmin(circleId),
    ]).then(([c, e, role, p, members]) => {
      setCircle(c);
      setEvents(e);
      setIsOrganizer(role === 'organizer');
      setPolls(p);
      // Check if this user is the last organizer
      const organizers = (members as any[]).filter((m: any) => m.role === 'organizer');
      setIsLastOrganizer(role === 'organizer' && organizers.length <= 1);
    }).finally(() => setLoading(false));
  }, [circleId, user]);

  const openSettings = () => {
    if (!circle) return;
    setEditName(circle.name);
    setEditDescription(circle.description || '');
    setEditEmoji(circle.emoji || '');
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateCircleAdmin(circleId, {
        name: editName.trim(),
        description: editDescription.trim(),
        emoji: editEmoji,
      }, user.uid);
      toast.success('サークル情報を更新しました');
      setSettingsOpen(false);
      const c = await getCircle(circleId);
      setCircle(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    setLeaving(true);
    try {
      await leaveCircleAdmin(circleId, user.uid);
      toast.success('サークルを脱退しました');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '脱退に失敗しました');
      setLeaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-50" />
    </div>;
  }

  if (!circle) return <p className="text-muted-foreground">サークルが見つかりません</p>;

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
  });

  const memberCount = 0; // filled by getCircleMembersAdmin
  const upcomingCount = events.filter(e => {
    const d = (e.date as any)?.toDate?.() ?? new Date(e.date as any);
    return d > new Date();
  }).length;
  const openPollCount = polls.filter(p => p.status === 'open').length;

  return (
    <div className="space-y-8">
      {/* Circle header */}
      <motion.div {...stagger(0)} className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50">
            <CircleIcon emoji={circle.emoji} size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{circle.name}</h1>
            {circle.description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{circle.description}</p>
            )}
          </div>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <InviteLinkButton circleId={circleId} currentUserUid={user!.uid} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-neutral-50">
                  <MoreHorizontal className="inline-block h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  管理
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/members`}>👥 メンバー</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/guests`}>👤 ゲスト管理</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/analytics`}>📊 アナリティクス</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/circles/${circleId}/menu`}>🍹 ドリンクメニュー</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  サークル設定
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </motion.div>

      {/* Quick stats */}
      <motion.div {...stagger(1)} className="flex gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {upcomingCount > 0 ? `${upcomingCount}件の予定` : '予定なし'}
        </div>
        {openPollCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] text-muted-foreground">
            <Vote className="h-3 w-3" />
            {openPollCount}件の調整中
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] text-muted-foreground">
          <Users className="h-3 w-3" />
          全{events.length}イベント
        </div>
      </motion.div>

      {/* Events section - Calendar */}
      <motion.div {...stagger(2)}>
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
          <EventCalendar events={events} circleId={circleId} />
        )}
      </motion.div>

      {/* Polls section */}
      <motion.div {...stagger(3)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            🗳️ 日程調整
          </h2>
          {isOrganizer && (
            <Link
              href={`/circles/${circleId}/polls/create`}
              className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              新規作成
            </Link>
          )}
        </div>

        {polls.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-14 text-center">
            <p className="text-3xl">🗳️</p>
            <div>
              <p className="text-sm font-medium">日程調整がありません</p>
              {isOrganizer && (
                <p className="mt-1 text-[13px] text-muted-foreground">メンバーの都合を確認しましょう</p>
              )}
            </div>
            {isOrganizer && (
              <Link
                href={`/circles/${circleId}/polls/create`}
                className="rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
              >
                日程調整を作成
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {polls.map((poll) => (
              <Link
                key={poll.id}
                href={`/circles/${circleId}/polls/${poll.id}`}
                className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-neutral-300 hover:shadow-sm active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{poll.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${poll.status === 'open'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-neutral-100 text-neutral-500'
                      }`}>
                      {poll.status === 'open' ? '受付中' : '締め切り'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    📅 {poll.candidateDates.length}つの候補日
                    {poll.deadline && (
                      <span className="ml-2">
                        🕐 〜{format(new Date(poll.deadline), 'M/d(E)', { locale: ja })}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-[12px] text-muted-foreground">→</span>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Leaderboard */}
      {user && (
        <motion.div {...stagger(4)}>
          <CircleLeaderboard circleId={circleId} currentUid={user.uid} />
        </motion.div>
      )}

      {/* Leave circle */}
      <div className="border-t pt-6">
        <button
          onClick={() => setLeaveOpen(true)}
          disabled={isLastOrganizer}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          サークルを脱退
        </button>
        {isLastOrganizer && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            最後のオーガナイザーのため脱退できません。他のメンバーをオーガナイザーに昇格してください。
          </p>
        )}
      </div>

      {/* Leave confirmation dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>サークルを脱退</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-[13px] text-muted-foreground">
              「{circle.name}」を脱退しますか？サークルのイベントや情報にアクセスできなくなります。
            </p>
            <div className="flex gap-3 border-t pt-4">
              <button
                onClick={() => setLeaveOpen(false)}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {leaving ? '脱退中...' : '脱退する'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>サークル設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">アイコン</Label>
              <CircleIconPicker value={editEmoji} onChange={setEditEmoji}>
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-neutral-200 transition-colors hover:bg-neutral-50"
                >
                  <CircleIcon emoji={editEmoji} size={40} />
                </button>
              </CircleIconPicker>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">サークル名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">説明</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="サークルの説明（任意）"
                className="resize-none border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
              />
            </div>
            <div className="flex gap-3 border-t pt-4">
              <button
                onClick={() => setSettingsOpen(false)}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving || !editName.trim()}
                className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
