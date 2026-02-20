'use server';

import { adminDb } from '@/lib/firebase/adminApp';

// =====================
// Recharts 用シリアライズ済み型
// =====================

/** イベントごとの出席統計（グラフデータ用） */
export interface EventAttendanceStat {
  eventId: string;
  /** グラフの X 軸ラベル用の短いイベント名 */
  eventName: string;
  /** ISO 文字列（Recharts でソートやツールチップに使用） */
  eventDate: string;
  totalMembers: number;
  attendedCount: number;
  /** 0〜100 の整数 */
  attendanceRate: number;
  unpaidCount: number;
}

/** 未払いメンバー一覧（テーブル表示用） */
export interface UnpaidMember {
  id: string;
  displayName: string;
  email?: string;
  isGuest: boolean;
  eventName: string;
  eventDate: string;
  amount: number;
}

/** getCircleAnalytics の戻り値 */
export interface CircleAnalyticsData {
  /** 時系列順（古い順）の出席率データ。Recharts の BarChart に渡す。 */
  stats: EventAttendanceStat[];
  /** サークル全体の未払いメンバー一覧 */
  unpaidMembers: UnpaidMember[];
  totalEvents: number;
  /** 全イベントの平均出席率（%） */
  avgAttendanceRate: number;
  /** 未払い合計金額（円） */
  totalUnpaidAmount: number;
}

// =====================
// メイン集計関数
// =====================

/**
 * サークルのアナリティクスデータを集計して返す。
 * オーガナイザーのみ呼び出し可能。
 * 全フィールドは JSON シリアライズ済み（Timestamp なし）。
 */
export async function getCircleAnalytics(
  circleId: string,
  currentUserUid: string
): Promise<CircleAnalyticsData> {
  // 権限確認（オーガナイザーのみ）
  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(currentUserUid)
    .get();

  if (!memberSnap.exists || memberSnap.data()?.role !== 'organizer') {
    throw new Error('アナリティクスはオーガナイザーのみ閲覧できます');
  }

  // メンバー総数
  const membersSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .get();
  const totalMembers = membersSnap.size;

  // イベント一覧（日付降順、最新 20 件）
  const eventsSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .orderBy('date', 'desc')
    .limit(20)
    .get();

  const stats: EventAttendanceStat[] = [];
  const unpaidMembers: UnpaidMember[] = [];

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();
    const eventDate: string =
      eventData.date?.toDate().toISOString() ?? new Date(0).toISOString();
    const eventName = eventData.name as string;

    // 出欠データ（参加者のみ）
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
      totalMembers > 0
        ? Math.round((attendedCount / totalMembers) * 100)
        : 0;

    // 未払い支払いレコード
    const unpaidSnap = await adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventDoc.id)
      .collection('payments')
      .where('status', '==', 'unpaid')
      .get();

    for (const payDoc of unpaidSnap.docs) {
      const payData = payDoc.data();
      unpaidMembers.push({
        id: payDoc.id,
        displayName: payData.displayName as string,
        email: payData.email as string | undefined,
        isGuest: payData.isGuest as boolean,
        eventName,
        eventDate,
        amount: payData.amount as number,
      });
    }

    stats.push({
      eventId: eventDoc.id,
      eventName,
      eventDate,
      totalMembers,
      attendedCount,
      attendanceRate,
      unpaidCount: unpaidSnap.size,
    });
  }

  // グラフ用に古い順（昇順）へ並び替え
  stats.reverse();

  const avgAttendanceRate =
    stats.length > 0
      ? Math.round(
          stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length
        )
      : 0;

  const totalUnpaidAmount = unpaidMembers.reduce(
    (sum, u) => sum + u.amount,
    0
  );

  return {
    stats,
    unpaidMembers,
    totalEvents: stats.length,
    avgAttendanceRate,
    totalUnpaidAmount,
  };
}
