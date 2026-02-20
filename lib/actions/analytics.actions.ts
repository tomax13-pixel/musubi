'use server';

import { adminDb } from '@/lib/firebase/adminApp';

// ==============================
// Types
// ==============================

export interface AttendanceStat {
  eventId: string;
  eventName: string;
  /** 0〜100 の整数（出席者数 / 参加記録総数 × 100） */
  attendanceRate: number;
}

export interface UnpaidMember {
  id: string; // uid or guestId
  displayName: string;
  email?: string;
  amount: number;
}

export interface UnpaidEventGroup {
  eventId: string;
  eventName: string;
  members: UnpaidMember[];
}

// ==============================
// Attendance Stats
// ==============================

/**
 * サークルの直近イベント（最大10件）について出席率を集計して返す。
 * Recharts の BarChart に渡せる形式。
 */
export async function getCircleAttendanceStats(
  circleId: string
): Promise<AttendanceStat[]> {
  const eventsSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .orderBy('date', 'desc')
    .limit(10)
    .get();

  const stats: AttendanceStat[] = [];

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();
    const eventId = eventDoc.id;
    const eventName = (eventData.name as string) ?? '(無題)';

    const attendanceSnap = await adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventId)
      .collection('attendance')
      .get();

    const total = attendanceSnap.size;
    const attended = attendanceSnap.docs.filter(
      (d) => d.data().attended === true
    ).length;

    const attendanceRate =
      total === 0 ? 0 : Math.round((attended / total) * 100);

    stats.push({ eventId, eventName, attendanceRate });
  }

  // 古い順（左が過去）で表示するため reverse
  return stats.reverse();
}

// ==============================
// Unpaid Members
// ==============================

/**
 * サークルの直近イベント（最大10件）について、
 * status が 'unpaid' の支払い記録をイベントごとにグループ化して返す。
 * 未払いメンバーがいないイベントは結果から除外する。
 */
export async function getUnpaidMembersForCircle(
  circleId: string
): Promise<UnpaidEventGroup[]> {
  const eventsSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .orderBy('date', 'desc')
    .limit(10)
    .get();

  const groups: UnpaidEventGroup[] = [];

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();
    const eventId = eventDoc.id;
    const eventName = (eventData.name as string) ?? '(無題)';

    const paymentsSnap = await adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventId)
      .collection('payments')
      .where('status', '==', 'unpaid')
      .get();

    if (paymentsSnap.empty) continue;

    const members: UnpaidMember[] = paymentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        displayName: (data.displayName as string) ?? '(不明)',
        email: (data.email as string | undefined) ?? undefined,
        amount: (data.amount as number) ?? 0,
      };
    });

    groups.push({ eventId, eventName, members });
  }

  return groups;
}
