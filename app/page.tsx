'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // ログイン済みの場合はダッシュボードへ
      router.replace('/dashboard');
    } else {
      // 未ログインの場合はログインページへ
      router.replace('/login');
    }
  }, [user, loading, router]);

  // リダイレクト中は何も表示しない（またはローディング表示）
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl font-bold mb-2">結</div>
        <div className="text-sm text-neutral-500">読み込み中...</div>
      </div>
    </div>
  );
}
