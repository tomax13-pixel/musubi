'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { createEventAdmin } from '@/lib/actions/admin.actions';
import { getCircle } from '@/lib/actions/circle.actions';

export default function CreateEventPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(searchParams.get('date') ?? '');
  const [location, setLocation] = useState('');
  const [fee, setFee] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [recentFees, setRecentFees] = useState<number[]>([]);

  useEffect(() => {
    getCircle(circleId).then((circle) => {
      if (circle && (circle as any).recentFees) {
        setRecentFees((circle as any).recentFees);
      }
    }).catch(() => {});
  }, [circleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const id = await createEventAdmin(
        circleId,
        {
          name: name.trim(),
          description: description.trim(),
          date: new Date(date).toISOString(),
          location: location.trim(),
          fee: parseInt(fee, 10) || 0,
        },
        user.uid
      );
      toast.success('イベントを作成しました');
      router.push(`/circles/${circleId}/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '作成に失敗しました');
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">📅 イベントを作成</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="event-name" className="text-[12px] text-muted-foreground">イベント名</Label>
          <Input
            id="event-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：4月ダーツ会"
            required
            maxLength={50}
            className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-date" className="text-[12px] text-muted-foreground">日時</Label>
          <Input
            id="event-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-location" className="text-[12px] text-muted-foreground">場所</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例：ラウンドワン渋谷"
            maxLength={100}
            className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-fee" className="text-[12px] text-muted-foreground">参加費（円）</Label>
          <Input
            id="event-fee"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0（無料）"
            min="0"
            className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
          {recentFees.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">最近:</span>
              {recentFees.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFee(String(f))}
                  className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-neutral-50"
                >
                  ¥{f.toLocaleString()}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            基本料金（ダーツ代等）。ドリンク代はイベント後に個別追加できます。
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-desc" className="text-[12px] text-muted-foreground">説明</Label>
          <Textarea
            id="event-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="イベントの説明を入力..."
            rows={3}
            maxLength={500}
            className="resize-none border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
        </div>

        <div className="flex gap-3 border-t pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-neutral-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !date}
            className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {submitting ? '作成中...' : '作成する'}
          </button>
        </div>
      </form>
    </div>
  );
}
