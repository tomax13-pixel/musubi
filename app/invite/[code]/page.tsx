'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getInviteInfo, joinCircleByInvite } from '@/lib/actions/invite.actions';
import { toast } from 'sonner';

export default function InvitePage() {
    const params = useParams();
    const code = params['code'] as string;
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [inviteInfo, setInviteInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    // 招待情報を取得
    useEffect(() => {
        if (!code) return;
        getInviteInfo(code)
            .then((info) => {
                if (!info.valid) {
                    setError(info.error || '無効な招待リンクです');
                } else {
                    setInviteInfo(info);
                }
            })
            .catch(() => {
                setError('招待情報の取得に失敗しました');
            })
            .finally(() => setLoading(false));
    }, [code]);

    // 参加ボタン
    const handleJoin = async () => {
        if (!user) return;
        setJoining(true);
        try {
            const result = await joinCircleByInvite(code, {
                uid: user.uid,
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || null,
            });

            if (result.alreadyMember) {
                toast.info('すでにこのサークルのメンバーです');
            } else {
                toast.success('サークルに参加しました！🎉');
            }
            router.push(`/circles/${result.circleId}`);
        } catch (error: any) {
            toast.error(error.message || '参加に失敗しました');
            setJoining(false);
        }
    };

    // ローディング中
    if (loading || authLoading) {
        return (
            <div className="text-center space-y-4 py-12">
                <div className="text-4xl">🔗</div>
                <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                <p className="text-[13px] text-muted-foreground">読み込み中...</p>
            </div>
        );
    }

    // エラー
    if (error) {
        return (
            <div className="text-center space-y-4 py-12">
                <div className="text-4xl">😢</div>
                <h1 className="text-lg font-semibold">招待リンクが無効です</h1>
                <p className="text-[13px] text-muted-foreground">{error}</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-4 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
                >
                    ダッシュボードへ
                </button>
            </div>
        );
    }

    // 未ログイン
    if (!user) {
        return (
            <div className="text-center space-y-6 py-12">
                <div className="text-5xl">{inviteInfo?.circleEmoji || '🎯'}</div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {inviteInfo?.circleName}
                    </h1>
                    {inviteInfo?.circleDescription && (
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            {inviteInfo.circleDescription}
                        </p>
                    )}
                    <p className="mt-2 text-[12px] text-muted-foreground">
                        👥 {inviteInfo?.memberCount}人のメンバー
                    </p>
                </div>

                <div className="space-y-3">
                    <p className="text-[13px] text-muted-foreground">
                        参加するにはログインが必要です
                    </p>
                    <button
                        onClick={() => {
                            // 現在のURLをsessionStorageに保存してログインへ
                            if (typeof window !== 'undefined') {
                                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                            }
                            router.push('/login');
                        }}
                        className="w-full rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
                    >
                        Googleでログイン
                    </button>
                </div>
            </div>
        );
    }

    // ログイン済み → 参加確認画面
    return (
        <div className="text-center space-y-6 py-12">
            <div className="text-5xl">{inviteInfo?.circleEmoji || '🎯'}</div>
            <div>
                <h1 className="text-xl font-semibold tracking-tight">
                    {inviteInfo?.circleName}
                </h1>
                {inviteInfo?.circleDescription && (
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        {inviteInfo.circleDescription}
                    </p>
                )}
                <p className="mt-2 text-[12px] text-muted-foreground">
                    👥 {inviteInfo?.memberCount}人のメンバー
                </p>
            </div>

            <div className="space-y-3 pt-2">
                <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                    {joining ? '参加中...' : 'このサークルに参加する'}
                </button>
                <p className="text-[12px] text-muted-foreground">
                    {user.displayName} としてログイン中
                </p>
            </div>
        </div>
    );
}
