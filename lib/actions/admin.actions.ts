'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/adminApp';
import type { CreateCircleInput } from '@/lib/types/models';

// ============================================================
// Timestamp シリアライズ共通処理
// Server Actions から Client へデータを返す際、
// Firestore の Timestamp を文字列化して "Only plain objects" エラーを防ぐ
// ============================================================

export function serializeDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof (value as { toDate?: unknown }).toDate === 'function') {
      // Firestore Timestamp (Admin SDK)
      result[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? serializeDoc(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object') {
      result[key] = serializeDoc(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================
// AttendeeInput 型
// ============================================================

export interface AttendeeInput {
  id: string; // uid for members, guestId for guests
  isGuest: boolean;
  attended: boolean;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  uid?: string;
  guestId?: string;
}

// ============================================================
// サークル作成 (Admin SDK)
// ============================================================

export async function createCircleAdmin(
  input: CreateCircleInput,
  currentUser: {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  }
): Promise<string> {
  const circleRef = await adminDb.collection('circles').add({
    name: input.name,
    emoji: input.emoji || '',
    description: input.description,
    createdBy: currentUser.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 作成者を幹事として登録
  await adminDb
    .collection('circles')
    .doc(circleRef.id)
    .collection('members')
    .doc(currentUser.uid)
    .set({
      uid: currentUser.uid,
      role: 'organizer',
      joinedAt: FieldValue.serverTimestamp(),
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
    });

  return circleRef.id;
}

// ============================================================
// 出欠の一括記録 (Admin SDK / バッチ書き込み)
// ============================================================

export async function recordAttendanceAdmin(
  circleId: string,
  eventId: string,
  attendees: AttendeeInput[],
  currentUserUid: string
): Promise<void> {
  // 権限チェック：幹事のみ
  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(currentUserUid)
    .get();

  if (!memberSnap.exists || memberSnap.data()?.role !== 'organizer') {
    throw new Error('オーガナイザーのみ出欠を記録できます');
  }

  // イベント情報取得（参加費）
  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();

  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = (eventSnap.data()?.fee as number) ?? 0;

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  for (const attendee of attendees) {
    const attendanceRef = adminDb
      .collection('circles')
      .doc(circleId)
      .collection('events')
      .doc(eventId)
      .collection('attendance')
      .doc(attendee.id);

    const attendanceData: Record<string, unknown> = {
      eventId,
      circleId,
      isGuest: attendee.isGuest,
      attended: attendee.attended,
      checkedInAt: attendee.attended ? now : null,
      checkedInBy: currentUserUid,
      displayName: attendee.displayName,
    };

    if (attendee.isGuest && attendee.guestId) {
      attendanceData['guestId'] = attendee.guestId;
    } else if (!attendee.isGuest && attendee.uid) {
      attendanceData['uid'] = attendee.uid;
    }
    if (attendee.email) attendanceData['email'] = attendee.email;
    if (attendee.photoURL !== undefined) attendanceData['photoURL'] = attendee.photoURL;

    batch.set(attendanceRef, attendanceData);

    // 出席者のみ支払い記録を作成
    if (attendee.attended) {
      const paymentRef = adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('payments')
        .doc(attendee.id);

      const paymentData: Record<string, unknown> = {
        eventId,
        circleId,
        isGuest: attendee.isGuest,
        amount: fee,
        status: 'unpaid',
        markedPaidAt: null,
        confirmedAt: null,
        createdAt: now,
        updatedAt: now,
        displayName: attendee.displayName,
      };

      if (attendee.isGuest && attendee.guestId) {
        paymentData['guestId'] = attendee.guestId;
      } else if (!attendee.isGuest && attendee.uid) {
        paymentData['uid'] = attendee.uid;
      }
      if (attendee.email) paymentData['email'] = attendee.email;

      batch.set(paymentRef, paymentData);
    }
  }

  await batch.commit();
}

// ============================================================
// QRコードチェックイン (Admin SDK)
// ============================================================

export async function qrCheckInAdmin(
  circleId: string,
  eventId: string,
  memberUid: string,
  currentUserUid: string
): Promise<{ success: boolean; displayName: string }> {
  // 権限チェック：幹事のみ
  const organizerSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(currentUserUid)
    .get();

  if (!organizerSnap.exists || organizerSnap.data()?.role !== 'organizer') {
    throw new Error('オーガナイザーのみチェックインを実行できます');
  }

  // メンバー確認
  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(memberUid)
    .get();

  if (!memberSnap.exists) throw new Error('このサークルのメンバーではありません');
  const memberData = memberSnap.data()!;

  // イベント情報取得（参加費）
  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();

  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = (eventSnap.data()?.fee as number) ?? 0;

  // 重複チェックイン確認
  const existingSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('attendance')
    .doc(memberUid)
    .get();

  if (existingSnap.exists && existingSnap.data()?.attended) {
    return { success: false, displayName: memberData['displayName'] as string };
  }

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  // 出欠記録
  const attendanceRef = adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('attendance')
    .doc(memberUid);

  batch.set(attendanceRef, {
    eventId,
    circleId,
    isGuest: false,
    uid: memberUid,
    attended: true,
    checkedInAt: now,
    checkedInBy: currentUserUid,
    displayName: memberData['displayName'],
    email: memberData['email'] || '',
    photoURL: memberData['photoURL'] || null,
  });

  // 支払い記録を自動生成
  const paymentRef = adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('payments')
    .doc(memberUid);

  batch.set(paymentRef, {
    eventId,
    circleId,
    isGuest: false,
    uid: memberUid,
    amount: fee,
    status: 'unpaid',
    markedPaidAt: null,
    confirmedAt: null,
    createdAt: now,
    updatedAt: now,
    displayName: memberData['displayName'],
    email: memberData['email'] || '',
  });

  await batch.commit();

  return { success: true, displayName: memberData['displayName'] as string };
}

// ============================================================
// メンバー一覧取得 (Admin SDK)
// ============================================================

export interface SerializedMember {
  uid: string;
  role: 'organizer' | 'member';
  joinedAt: string; // ISO string
  displayName: string;
  email: string;
  photoURL: string | null;
}

export async function getCircleMembersAdmin(circleId: string): Promise<SerializedMember[]> {
  const snap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: data['uid'] as string,
      role: data['role'] as 'organizer' | 'member',
      joinedAt: data['joinedAt']?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      displayName: data['displayName'] as string,
      email: data['email'] as string,
      photoURL: (data['photoURL'] as string | null) ?? null,
    };
  });
}
