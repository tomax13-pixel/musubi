'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { createCircle } from '@/lib/actions/circle.actions';
import { EmojiPicker } from '@/components/circles/EmojiPicker';

export default function CreateCirclePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎾');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const id = await createCircle(
        { name: name.trim(), emoji, description: description.trim() },
        {
          uid: user.uid,
          displayName: user.displayName ?? '名前未設定',
          email: user.email ?? '',
          photoURL: user.photoURL,
        }
      );
      toast.success('サークルを作成しました');
      router.push(`/circles/${id}`);
    } catch (err) {
      toast.error('作成に失敗しました');
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">サークルを作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-[12px] text-muted-foreground">アイコン</Label>
            <div className="mt-1.5">
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="name" className="text-[12px] text-muted-foreground">サークル名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：週末テニス部"
              required
              maxLength={50}
              className="border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-[12px] text-muted-foreground">説明</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="サークルの説明を入力..."
            rows={3}
            maxLength={200}
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
            disabled={submitting || !name.trim()}
            className="flex-1 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {submitting ? '作成中...' : '作成する'}
          </button>
        </div>
      </form>
    </div>
  );
}
