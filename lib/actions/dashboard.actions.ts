'use server';

import { adminDb } from '@/lib/firebase/adminApp';

/**
 * ホーム画面用: ユーザーの全サークル横断で「やるべきこと」と「直近イベント」を取得
 */

interface ActionItem {
  type: 'attendance' | 'payment' | 'poll';
  circleId: string;
  circleName: string;
  circleEmoji: string;
  eventId?: string;
  pollId?: string;
  title: string;
  subtitle: string;
  date?: string;
}

interface UpcomingEvent {
  id: string;
  circleId: string;
  circleName: string;
  circleEmoji: string;
  name: string;
  date: string;
  location?: string;
  fee?: number;
  myAttendance: boolean | null; // true=参加, false=不参加, null=未回答
}

export interface CircleDetail {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  nextEvent: {
    id: string;
    name: string;
    date: string;
    location?: string;
  } | null;
}

export async function getDashboardData(uid: string): Promise<{
  actions: ActionItem[];
  upcomingEvents: UpcomingEvent[];
  circleDetails: CircleDetail[];
}> {
  // 1. ユーザーが所属する全サークルを取得
  const memberSnaps = await adminDb
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  const circleIds = memberSnaps.docs.map((doc) => {
    const ref = doc.ref;
    // members/{uid} の親は circles/{circleId}
    return ref.parent.parent!.id;
  });

  if (circleIds.length === 0) {
    return { actions: [], upcomingEvents: [], circleDetails: [] };
  }

  // 2. 各サークルの情報を取得
  const circleMap: Record<string, { name: string; emoji: string }> = {};
  for (const cid of circleIds) {
    const circleDoc = await adminDb.doc(`circles/${cid}`).get();
    if (circleDoc.exists) {
      const data = circleDoc.data()!;
      circleMap[cid] = { name: data.name, emoji: data.emoji || '📌' };
    }
  }

  const now = new Date();
  const actions: ActionItem[] = [];
  const upcomingEvents: UpcomingEvent[] = [];
  const circleDetails: CircleDetail[] = [];

  // 3. 各サークルのイベントをチェック
  for (const circleId of circleIds) {
    const circle = circleMap[circleId];
    if (!circle) continue;

    // メンバー数を取得
    const membersSnap = await adminDb
      .collection(`circles/${circleId}/members`)
      .get();
    const memberCount = membersSnap.size;

    // 将来のイベントを取得
    const eventsSnap = await adminDb
      .collection(`circles/${circleId}/events`)
      .orderBy('date', 'asc')
      .get();

    // サークルカード用: 次の直近イベントを探す
    let nextEvent: CircleDetail['nextEvent'] = null;

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();
      const eventDate = event.date?.toDate?.() ?? new Date(event.date);
      
      // 過去のイベントはスキップ（ただし、未払いは表示）
      const isPast = eventDate < now;

      // 出欠の確認
      const attDoc = await adminDb
        .doc(`circles/${circleId}/events/${eventDoc.id}/attendance/${uid}`)
        .get();

      let myAttendance: boolean | null = null;
      if (attDoc.exists) {
        const attData = attDoc.data()!;
        myAttendance = attData.attended ?? null;
      }

      // 未来のイベントなら直近イベントに追加
      if (!isPast) {
        // サークルカード用: 最初の未来イベントを保存
        if (!nextEvent) {
          nextEvent = {
            id: eventDoc.id,
            name: event.name,
            date: eventDate.toISOString(),
            location: event.location || undefined,
          };
        }

        upcomingEvents.push({
          id: eventDoc.id,
          circleId,
          circleName: circle.name,
          circleEmoji: circle.emoji,
          name: event.name,
          date: eventDate.toISOString(),
          location: event.location || undefined,
          fee: event.fee || undefined,
          myAttendance,
        });

        // 未回答の出欠はアクションに追加
        if (myAttendance === null) {
          actions.push({
            type: 'attendance',
            circleId,
            circleName: circle.name,
            circleEmoji: circle.emoji,
            eventId: eventDoc.id,
            title: `${event.name} の出欠`,
            subtitle: `${formatSimpleDate(eventDate)}`,
            date: eventDate.toISOString(),
          });
        }
      }

      // 未払いチェック
      const payDoc = await adminDb
        .doc(`circles/${circleId}/events/${eventDoc.id}/payments/${uid}`)
        .get();

      if (payDoc.exists) {
        const pay = payDoc.data()!;
        if (pay.status === 'unpaid') {
          actions.push({
            type: 'payment',
            circleId,
            circleName: circle.name,
            circleEmoji: circle.emoji,
            eventId: eventDoc.id,
            title: `${event.name} の参加費`,
            subtitle: `¥${(pay.amount || 0).toLocaleString()}`,
            date: eventDate.toISOString(),
          });
        }
      }
    }

    // 4. 未回答の日程調整をチェック
    const pollsSnap = await adminDb
      .collection(`circles/${circleId}/polls`)
      .where('status', '==', 'open')
      .get();

    for (const pollDoc of pollsSnap.docs) {
      const poll = pollDoc.data();
      const voteDoc = await adminDb
        .doc(`circles/${circleId}/polls/${pollDoc.id}/votes/${uid}`)
        .get();

      if (!voteDoc.exists) {
        actions.push({
          type: 'poll',
          circleId,
          circleName: circle.name,
          circleEmoji: circle.emoji,
          pollId: pollDoc.id,
          title: `${poll.title}`,
          subtitle: `${poll.candidateDates?.length || 0}つの候補日`,
        });
      }
    }

    // サークル詳細をリストに追加
    circleDetails.push({
      id: circleId,
      name: circle.name,
      emoji: circle.emoji,
      memberCount,
      nextEvent,
    });
  }

  // イベントを日付順にソート（直近が先）
  upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // アクションを種類順にソート：出欠 → 支払い → 日程調整
  const typePriority = { attendance: 0, payment: 1, poll: 2 };
  actions.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

  return {
    actions: actions.slice(0, 10),
    upcomingEvents: upcomingEvents.slice(0, 10),
    circleDetails,
  };
}

function formatSimpleDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const day = dayNames[date.getDay()];
  return `${m}/${d}(${day})`;
}
