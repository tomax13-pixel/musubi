'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getPollWithVotes, submitPollVoteAdmin, closePollAdmin } from '@/lib/actions/poll.actions';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type VoteValue = 'ok' | 'maybe' | 'ng';

const VOTE_LABELS: Record<VoteValue, string> = {
    ok: '⭕️',
    maybe: '🔺',
    ng: '❌',
};

export default function PollDetailPage() {
    const params = useParams();
    const circleId = params['circleId'] as string;
    const pollId = params['pollId'] as string;
    const router = useRouter();
    const { user } = useAuthContext();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [myResponses, setMyResponses] = useState<Record<string, VoteValue>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            getPollWithVotes(circleId, pollId),
            getCurrentUserRole(circleId, user.uid),
        ]).then(([pollData, role]) => {
            setData(pollData);
            setIsOrganizer(role === 'organizer');

            // 既存の自分の回答をロード
            if (pollData) {
                const myVote = pollData.votes.find((v: any) => v.uid === user.uid);
                if (myVote) {
                    setMyResponses(myVote.responses);
                }
            }
        }).finally(() => setLoading(false));
    }, [circleId, pollId, user]);

    // 集計計算
    const summary = useMemo(() => {
        if (!data) return {};
        const counts: Record<string, { ok: number; maybe: number; ng: number }> = {};
        for (const cd of data.poll.candidateDates) {
            counts[cd.id] = { ok: 0, maybe: 0, ng: 0 };
        }
        for (const vote of data.votes) {
            for (const [dateId, response] of Object.entries(vote.responses)) {
                if (counts[dateId] && (response === 'ok' || response === 'maybe' || response === 'ng')) {
                    counts[dateId][response as VoteValue]++;
                }
            }
        }
        return counts;
    }, [data]);

    // 最多⭕️の候補日ID
    const bestDateId = useMemo(() => {
        if (!data || Object.keys(summary).length === 0) return null;
        let maxOk = -1;
        let bestId = '';
        for (const [id, counts] of Object.entries(summary)) {
            if (counts.ok > maxOk) {
                maxOk = counts.ok;
                bestId = id;
            }
        }
        return maxOk > 0 ? bestId : null;
    }, [data, summary]);

    const toggleVote = (dateId: string) => {
        if (data?.poll.status === 'closed') return;
        const current = myResponses[dateId];
        const order: VoteValue[] = ['ok', 'maybe', 'ng'];
        const nextIndex = current ? (order.indexOf(current) + 1) % 3 : 0;
        setMyResponses((prev) => ({ ...prev, [dateId]: order[nextIndex]! }));
    };

    const handleSubmitVote = async () => {
        if (!user) return;
        // 全候補日に回答しているか確認
        const unanswered = data.poll.candidateDates.filter((cd: any) => !myResponses[cd.id]);
        if (unanswered.length > 0) {
            toast.error('すべての候補日に回答してください');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitPollVoteAdmin(circleId, pollId, user.uid, myResponses);
            toast.success('回答を送信しました');
            // リロードして集計を更新
            const updated = await getPollWithVotes(circleId, pollId);
            setData(updated);
        } catch (error: any) {
            toast.error(error.message || '回答の送信に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!user) return;
        if (!confirm('アンケートを締め切りますか？締め切り後はメンバーが回答できなくなります。')) return;
        setIsClosing(true);
        try {
            await closePollAdmin(circleId, pollId, user.uid);
            toast.success('アンケートを締め切りました');
            const updated = await getPollWithVotes(circleId, pollId);
            setData(updated);
        } catch (error: any) {
            toast.error(error.message || '締め切りに失敗しました');
        } finally {
            setIsClosing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
                <div className="h-40 w-full animate-pulse rounded bg-neutral-50" />
            </div>
        );
    }

    if (!data) return <p className="text-muted-foreground">アンケートが見つかりません</p>;

    const { poll, votes } = data;
    const isClosed = poll.status === 'closed';

    return (
        <div className="space-y-8">
            {/* ヘッダー */}
            <div className="space-y-1">
                <Link
                    href={`/circles/${circleId}`}
                    className="mb-2 flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    戻る
                </Link>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">🗳️ {poll.title}</h1>
                    {isClosed && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                            締め切り済み
                        </span>
                    )}
                </div>
                {poll.description && (
                    <p className="text-[13px] text-muted-foreground">{poll.description}</p>
                )}
                {poll.deadline && (
                    <p className="text-[12px] text-muted-foreground">
                        🕐 回答期限: {format(new Date(poll.deadline), 'M月d日(E) HH:mm', { locale: ja })}
                    </p>
                )}
            </div>

            {/* 集計テーブル */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr>
                            <th className="border-b border-neutral-200 px-3 py-2 text-left font-medium text-muted-foreground">
                                メンバー
                            </th>
                            {poll.candidateDates.map((cd: any) => (
                                <th
                                    key={cd.id}
                                    className={`border-b border-neutral-200 px-3 py-2 text-center font-medium ${bestDateId === cd.id ? 'bg-green-50' : ''
                                        }`}
                                >
                                    <div>{format(new Date(cd.date), 'M/d(E)', { locale: ja })}</div>
                                    {cd.label && (
                                        <div className="text-[11px] font-normal text-muted-foreground">{cd.label}</div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {votes.map((vote: any) => (
                            <tr key={vote.uid} className="border-b border-neutral-100">
                                <td className="px-3 py-2 font-medium">
                                    {vote.displayName}
                                    {vote.uid === user?.uid && (
                                        <span className="ml-1 text-[11px] text-muted-foreground">（自分）</span>
                                    )}
                                </td>
                                {poll.candidateDates.map((cd: any) => (
                                    <td
                                        key={cd.id}
                                        className={`px-3 py-2 text-center text-base ${bestDateId === cd.id ? 'bg-green-50' : ''
                                            }`}
                                    >
                                        {vote.responses[cd.id]
                                            ? VOTE_LABELS[vote.responses[cd.id] as VoteValue]
                                            : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {votes.length === 0 && (
                            <tr>
                                <td
                                    colSpan={poll.candidateDates.length + 1}
                                    className="px-3 py-8 text-center text-muted-foreground"
                                >
                                    まだ回答がありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* 集計行 */}
                    <tfoot>
                        <tr className="border-t-2 border-neutral-200 font-medium">
                            <td className="px-3 py-2 text-muted-foreground">⭕️ 合計</td>
                            {poll.candidateDates.map((cd: any) => (
                                <td
                                    key={cd.id}
                                    className={`px-3 py-2 text-center ${bestDateId === cd.id
                                        ? 'bg-green-50 text-green-700 font-bold'
                                        : ''
                                        }`}
                                >
                                    {summary[cd.id]?.ok ?? 0}
                                </td>
                            ))}
                        </tr>
                        <tr className="font-medium">
                            <td className="px-3 py-1 text-muted-foreground">🔺 合計</td>
                            {poll.candidateDates.map((cd: any) => (
                                <td
                                    key={cd.id}
                                    className={`px-3 py-1 text-center ${bestDateId === cd.id ? 'bg-green-50' : ''}`}
                                >
                                    {summary[cd.id]?.maybe ?? 0}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* 自分の回答エリア */}
            {!isClosed && (
                <div className="space-y-4 rounded-md border border-neutral-200 p-4">
                    <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                        あなたの回答
                    </h2>
                    <p className="text-[12px] text-muted-foreground">
                        各候補日をクリックして ⭕️ → 🔺 → ❌ を切り替えてください
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {poll.candidateDates.map((cd: any) => {
                            const val = myResponses[cd.id];
                            return (
                                <button
                                    key={cd.id}
                                    onClick={() => toggleVote(cd.id)}
                                    className={`flex flex-col items-center gap-1 rounded-md border px-4 py-3 transition-colors ${val
                                        ? 'border-neutral-300 bg-neutral-50'
                                        : 'border-dashed border-neutral-300'
                                        }`}
                                >
                                    <span className="text-[12px] font-medium">
                                        {format(new Date(cd.date), 'M/d(E)', { locale: ja })}
                                    </span>
                                    {cd.label && (
                                        <span className="text-[11px] text-muted-foreground">{cd.label}</span>
                                    )}
                                    <span className="text-xl">
                                        {val ? VOTE_LABELS[val] : '—'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={handleSubmitVote}
                        disabled={isSubmitting}
                        className="w-full rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                        {isSubmitting ? '送信中...' : '回答を送信'}
                    </button>
                </div>
            )}

            {/* 締め切り済み表示 */}
            {isClosed && (
                <div className="flex items-center gap-2 rounded-md bg-neutral-50 px-4 py-3 text-[13px] text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    このアンケートは締め切られました
                </div>
            )}

            {/* 幹事: 締め切りボタン */}
            {isOrganizer && !isClosed && (
                <button
                    onClick={handleClose}
                    disabled={isClosing}
                    className="w-full rounded-md border border-neutral-200 px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-neutral-50 disabled:opacity-50"
                >
                    {isClosing ? '締め切り中...' : '🔒 アンケートを締め切る'}
                </button>
            )}
        </div>
    );
}
