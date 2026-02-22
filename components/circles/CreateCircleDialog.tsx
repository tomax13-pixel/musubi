'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { createCircle } from '@/lib/actions/circle.actions';
import { EmojiPicker } from './EmojiPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateCircleDialog({ open, onClose }: Props) {
  const { user } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const id = await createCircle(
        { name: name.trim(), description: description.trim(), emoji },
        {
          uid: user.uid,
          displayName: user.displayName ?? '名前未設定',
          email: user.email ?? '',
          photoURL: user.photoURL,
        }
      );
      toast.success('サークルを作成しました');
      onClose();
      router.push(`/circles/${id}`);
    } catch (err) {
      toast.error('作成に失敗しました');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>サークルを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>アイコン</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="circle-name">サークル名 *</Label>
            <Input
              id="circle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：週末テニス部"
              required
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="circle-desc">説明</Label>
            <Textarea
              id="circle-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="サークルの説明を入力..."
              rows={3}
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
