'use server';

import { adminDb } from '@/lib/firebase/adminApp';

// ============================================================
// 型定義
// ============================================================

export interface EventAttendanceData {
  eventId: string;
  eventName: string;
  eventDate: string; // ISO string (Timestamp をシリアライズ)
  attendedCount: number;
  totalMembers: number;
  attendanceRate: number; // 0-100 の整数
}

export interface UnpaidMember {
  uid: string;
  displayName: string;
  email: string;
  amount: number;
  eventId: string;
  eventName: string;
}

// ============================================================
// サークルのイベント別出席率を集計 (Admin SDK)
// Recharts の BarChart に渡すデータを返す
// ============================================================

export async function getCircleAttendanceStats(
  circleId: string
): Promise<EventAttendanceData[]> {
  // メンバー総数
  const membersSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .get();
  const totalMembers = membersSnap.size;

  // 全イベント（日付降順）
  const eventsSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .orderBy('date', 'desc')
    .get();

  const results: EventAttendanceData[] = [];

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();

    // 出席者数（attended=true のみ）
    const attendanceSnap = await adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventDoc.id)
      .collection('attendance')
      .where('attended', '==', true)
      .get();

    const attendedCount = attendanceSnap.size;
    const attendanceRate =
      totalMembers > 0 ? Math.round((attendedCount / totalMembers) * 100) : 0;

    results.push({
      eventId: eventDoc.id,
      eventName: eventData['name'] as string,
      eventDate: eventData['date']?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      attendedCount,
      totalMembers,
      attendanceRate,
    });
  }

  return results;
}

// ============================================================
// サークル内の未払いメンバー一覧を取得 (Admin SDK)
// 全イベントを横断して status='unpaid' かつ isGuest=false を抽出
// ============================================================

export async function getUnpaidMembersForCircle(
  circleId: string
): Promise<UnpaidMember[]> {
  // 全イベント
  const eventsSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .orderBy('date', 'desc')
    .get();

  const unpaidList: UnpaidMember[] = [];

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();

    // 未払いかつメンバー（ゲスト除外）の支払い記録
    const paymentsSnap = await adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventDoc.id)
      .collection('payments')
      .where('status', '==', 'unpaid')
      .where('isGuest', '==', false)
      .get();

    for (const paymentDoc of paymentsSnap.docs) {
      const paymentData = paymentDoc.data();
      unpaidList.push({
        uid: paymentData['uid'] as string,
        displayName: paymentData['displayName'] as string,
        email: (paymentData['email'] as string) || '',
        amount: paymentData['amount'] as number,
        eventId: eventDoc.id,
        eventName: eventData['name'] as string,
      });
    }
  }

  return unpaidList;
}
