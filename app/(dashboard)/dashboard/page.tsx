'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCirclesForUser } from '@/lib/actions/circle.actions';
import type { Circle } from '@/lib/types/models';

export default function DashboardPage() {
  const { user } = useAuthContext();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCirclesForUser(user.uid)
      .then(setCircles)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          👋 おかえりなさい
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {user?.displayName}さんのダッシュボード
        </p>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            サークル
          </h2>
          <Link
            href="/circles/create"
            className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            新規作成
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-neutral-50" />
            ))}
          </div>
        ) : circles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-16 text-center">
            <p className="text-3xl">👥</p>
            <div>
              <p className="text-sm font-medium">サークルがありません</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                最初のサークルを作成してみましょう
              </p>
            </div>
            <Link
              href="/circles/create"
              className="rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
            >
              サークルを作成
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                href={`/circles/${circle.id}`}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <span className="text-xl leading-none">{circle.emoji || '📌'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{circle.name}</p>
                  {circle.description && (
                    <p className="truncate text-[12px] text-muted-foreground">
                      {circle.description}
                    </p>
                  )}
                </div>
                <span className="text-[12px] text-muted-foreground">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
