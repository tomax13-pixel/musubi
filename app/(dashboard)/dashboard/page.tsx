'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Calendar, Users, ChevronRight, MapPin } from 'lucide-react';
import { CircleIcon } from '@/components/circles/CircleIcon';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getDashboardData } from '@/lib/actions/dashboard.actions';
import type { CircleDetail } from '@/lib/actions/dashboard.actions';
import { ActionList } from '@/components/home/ActionList';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuthContext();
  const [actions, setActions] = useState<any[]>([]);
  const [circleDetails, setCircleDetails] = useState<CircleDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    getDashboardData(user.uid)
      .then((dashData) => {
        setActions(dashData.actions);
        setCircleDetails(dashData.circleDetails);
      })
      .catch((err) => {
        console.error('[Dashboard] error:', err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Compact greeting */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {user?.displayName}さん、おかえりなさい 👋
        </p>
        <p className="text-[13px] text-muted-foreground">
          {format(new Date(), 'M月d日(E)', { locale: ja })}
        </p>
      </div>

      {/* Action List — only shows when there are actions */}
      {!loading && actions.length > 0 && (
        <div>
          <h2 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-600">
              {actions.length}
            </span>
            やること
          </h2>
          <ActionList actions={actions} />
        </div>
      )}

      {/* Circles section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">
            マイサークル
          </h2>
          <Link
            href="/circles/create"
            className="flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            新規作成
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-50" />
            ))}
          </div>
        ) : circleDetails.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center bg-neutral-50/50">
            <div className="relative h-32 w-48">
              <Image
                src="/assets/illustrations/empty_circles.png"
                alt="サークルがありません"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 192px, 192px"
              />
            </div>
            <div>
              <p className="text-[15px] font-medium">サークルがありません</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                サークルを作成して、仲間を招待しましょう
              </p>
            </div>
            <Link
              href="/circles/create"
              className="mt-2 rounded-md bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-colors hover:bg-neutral-800"
            >
              サークルを作成
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {circleDetails.map((circle, i) => (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/circles/${circle.id}`}
                  className="group block rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-md active:scale-[0.99]"
                >
                  {/* Top row: icon + name + chevron */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50">
                      <CircleIcon emoji={circle.emoji} size={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold tracking-tight">{circle.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500" strokeWidth={1.5} />
                  </div>

                  {/* Bottom row: stats */}
                  <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
                    {/* Member count */}
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{circle.memberCount}人のメンバー</span>
                    </div>

                    {/* Separator */}
                    <div className="h-3 w-px bg-neutral-200" />

                    {/* Next event */}
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      {circle.nextEvent ? (
                        <span className="truncate">
                          {circle.nextEvent.name} · {format(new Date(circle.nextEvent.date), 'M/d(E)', { locale: ja })}
                        </span>
                      ) : (
                        <span>予定なし</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
