'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { createEventAdmin } from '@/lib/actions/admin.actions';

export default function CreateEventPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [fee, setFee] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          fee: parseInt(fee, 10),
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
            placeholder="例：4月テニス練習"
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
            placeholder="例：中央公園テニスコート"
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
            placeholder="例：1000"
            min="0"
            required
            className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
          />
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
            disabled={submitting || !name.trim() || !date || !fee}
            className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {submitting ? '作成中...' : '作成する'}
          </button>
        </div>
      </form>
    </div>
  );
}
