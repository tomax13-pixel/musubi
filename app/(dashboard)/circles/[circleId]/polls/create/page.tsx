'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, CalendarDays } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { createPollAdmin } from '@/lib/actions/poll.actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function CreatePollPage() {
    const params = useParams();
    const circleId = params['circleId'] as string;
    const router = useRouter();
    const { user } = useAuthContext();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [candidates, setCandidates] = useState<Array<{ id: string; date: string; label: string }>>([]);
    const [deadline, setDeadline] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addCandidate = () => {
        setCandidates([...candidates, {
            id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            date: '',
            label: '',
        }]);
    };

    const removeCandidate = (index: number) => {
        setCandidates(candidates.filter((_, i) => i !== index));
    };

    const updateCandidate = (index: number, field: 'date' | 'label', value: string) => {
        const updated = candidates.map((c, i) =>
            i === index ? { ...c, [field]: value } : c
        );
        setCandidates(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!title.trim()) {
            toast.error('タイトルを入力してください');
            return;
        }
        if (candidates.length < 2) {
            toast.error('候補日を2つ以上追加してください');
            return;
        }
        const invalidDates = candidates.filter(c => !c.date);
        if (invalidDates.length > 0) {
            toast.error('すべての候補日に日付を設定してください');
            return;
        }

        setIsSubmitting(true);
        try {
            await createPollAdmin(circleId, {
                title: title.trim(),
                description: description.trim() || undefined,
                candidateDates: candidates.map(c => ({
                    id: c.id,
                    date: new Date(c.date),
                    label: c.label || undefined,
                })),
                deadline: deadline ? new Date(deadline) : undefined,
            }, user.uid);

            toast.success('アンケートを作成しました');
            router.push(`/circles/${circleId}`);
        } catch (error: any) {
            toast.error(error.message || 'アンケートの作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <Link
                    href={`/circles/${circleId}`}
                    className="mb-2 flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    戻る
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight">🗳️ 日程調整を作成</h1>
                <p className="text-[13px] text-muted-foreground">
                    候補日を追加して、メンバーに回答してもらいましょう
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* タイトル */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium">タイトル</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例: 4月の練習日"
                        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        required
                    />
                </div>

                {/* 説明 */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium">説明（任意）</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="補足情報があれば入力"
                        rows={2}
                        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none resize-none focus:border-neutral-400"
                    />
                </div>

                {/* 候補日リスト */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[13px] font-medium">候補日</label>
                        <span className="text-[12px] text-muted-foreground">{candidates.length}件</span>
                    </div>

                    {candidates.length === 0 && (
                        <div className="rounded-md border border-dashed py-8 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-neutral-300" strokeWidth={1.5} />
                            <p className="mt-2 text-[13px] text-muted-foreground">候補日を追加してください</p>
                        </div>
                    )}

                    {candidates.map((candidate, index) => (
                        <div
                            key={candidate.id}
                            className="flex items-center gap-2 rounded-md border border-neutral-200 p-3"
                        >
                            <div className="flex flex-1 gap-2">
                                <input
                                    type="date"
                                    value={candidate.date}
                                    onChange={(e) => updateCandidate(index, 'date', e.target.value)}
                                    className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
                                    required
                                />
                                <input
                                    type="text"
                                    value={candidate.label}
                                    onChange={(e) => updateCandidate(index, 'label', e.target.value)}
                                    placeholder="ラベル（任意）例: 午前"
                                    className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeCandidate(index)}
                                className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addCandidate}
                        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 py-2 text-[13px] text-muted-foreground transition-colors hover:border-neutral-400 hover:text-foreground"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        候補日を追加
                    </button>
                </div>

                {/* 締め切り */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium">回答締め切り（任意）</label>
                    <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    />
                </div>

                {/* 送信 */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                    {isSubmitting ? '作成中...' : 'アンケートを作成'}
                </button>
            </form>
        </div>
    );
}
