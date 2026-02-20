'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import {
  getCircleAttendanceStats,
  getUnpaidMembersForCircle,
  type AttendanceStat,
  type UnpaidEventGroup,
} from '@/lib/actions/analytics.actions';
import { AttendanceChart } from './AttendanceChart';

export default function AnalyticsPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();

  const [isOrganizer, setIsOrganizer] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [unpaidGroups, setUnpaidGroups] = useState<UnpaidEventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const role = await getCurrentUserRole(circleId, user.uid);
        if (role !== 'organizer') {
          setIsOrganizer(false);
          return;
        }
        setIsOrganizer(true);

        const [statsData, unpaidData] = await Promise.all([
          getCircleAttendanceStats(circleId),
          getUnpaidMembersForCircle(circleId),
        ]);
        setStats(statsData);
        setUnpaidGroups(unpaidData);
      } finally {
        setLoading(false);
      }
    })();
  }, [circleId, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-100" />
        <div className="h-52 animate-pulse rounded bg-neutral-50" />
      </div>
    );
  }

  if (!isOrganizer) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-2xl">🔒</p>
        <p className="text-sm font-medium">幹事専用の機能です</p>
        <p className="text-[13px] text-muted-foreground">
          アナリティクスは幹事のみ閲覧できます
        </p>
        <Link
          href={`/circles/${circleId}`}
          className="mt-2 text-[13px] text-muted-foreground underline-offset-2 hover:underline"
        >
          ← サークルに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/circles/${circleId}`}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          ←
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">アナリティクス</h1>
      </div>

      {/* Attendance Rate Chart */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          📊 イベント別出席率
        </h2>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <AttendanceChart data={stats} />
        </div>
      </section>

      {/* Unpaid Members */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          💰 未払いメンバー管理
        </h2>

        {unpaidGroups.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center">
            <p className="text-sm font-medium">未払いメンバーはいません 🎉</p>
          </div>
        ) : (
          <div className="divide-y rounded-md border border-neutral-200 bg-white">
            {unpaidGroups.map((group) => {
              const isOpen = openAccordion === group.eventId;
              return (
                <div key={group.eventId}>
                  {/* Accordion trigger */}
                  <button
                    onClick={() =>
                      setOpenAccordion(isOpen ? null : group.eventId)
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                  >
                    <span className="text-sm font-medium">{group.eventName}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                        {group.members.length}名
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      )}
                    </span>
                  </button>

                  {/* Accordion content */}
                  {isOpen && (
                    <div className="divide-y border-t bg-neutral-50">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between px-5 py-2.5"
                        >
                          <div>
                            <p className="text-[13px] font-medium">
                              {member.displayName}
                            </p>
                            {member.email && (
                              <p className="text-[11px] text-muted-foreground">
                                {member.email}
                              </p>
                            )}
                          </div>
                          <span className="text-[13px] font-medium tabular-nums">
                            ¥{member.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
