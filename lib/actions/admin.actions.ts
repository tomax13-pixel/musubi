'use server';

import { adminDb, adminAuth } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';

// =====================
// シリアライズユーティリティ
// =====================

/**
 * Firestore Admin Timestamp を ISO 文字列に変換する。
 * クライアントへの受け渡し時に必ず使用すること。
 */
export function serializeTimestamp(
  ts: FirebaseFirestore.Timestamp | null | undefined
): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

/**
 * Firestore ドキュメントデータの全 Timestamp フィールドを ISO 文字列に変換する。
 */
export function serializeDoc(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (value as { toDate: unknown }).toDate === 'function'
    ) {
      result[key] = (value as FirebaseFirestore.Timestamp).toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

// =====================
// 内部ヘルパー
// =====================

async function assertOrganizer(circleId: string, uid: string): Promise<void> {
  const snap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(uid)
    .get();
  if (!snap.exists || snap.data()?.role !== 'organizer') {
    throw new Error('オーガナイザーのみ実行できます');
  }
}

// =====================
// サークル管理
// =====================

export async function createCircleAdmin(
  input: { name: string; emoji: string; description: string },
  currentUser: {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  }
): Promise<string> {
  const circleRef = adminDb.collection('circles').doc();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  batch.set(circleRef, {
    name: input.name,
    emoji: input.emoji || '',
    description: input.description,
    createdBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });

  const memberRef = circleRef.collection('members').doc(currentUser.uid);
  batch.set(memberRef, {
    uid: currentUser.uid,
    role: 'organizer',
    joinedAt: now,
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoURL: currentUser.photoURL,
  });

  await batch.commit();
  return circleRef.id;
}

export async function updateCircleAdmin(
  circleId: string,
  input: Partial<{ name: string; emoji: string; description: string }>,
  currentUserUid: string
): Promise<void> {
  await assertOrganizer(circleId, currentUserUid);
  await adminDb.collection('circles').doc(circleId).update({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// =====================
// メンバー管理
// =====================

export async function addMemberAdmin(
  circleId: string,
  email: string,
  currentUserUid: string
): Promise<{ uid: string; displayName: string }> {
  await assertOrganizer(circleId, currentUserUid);

  // Firebase Auth からメールアドレスでユーザーを検索
  const userRecord = await adminAuth.getUserByEmail(email);

  // users ドキュメントからプロフィールを取得
  const userDocSnap = await adminDb.collection('users').doc(userRecord.uid).get();
  const userData = userDocSnap.data();
  const displayName =
    userData?.displayName || userRecord.displayName || email;
  const photoURL = userData?.photoURL || userRecord.photoURL || null;

  // 既にメンバーか確認
  const existingSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(userRecord.uid)
    .get();
  if (existingSnap.exists) {
    throw new Error('このユーザーはすでにメンバーです');
  }

  await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(userRecord.uid)
    .set({
      uid: userRecord.uid,
      role: 'member',
      joinedAt: FieldValue.serverTimestamp(),
      displayName,
      email,
      photoURL,
    });

  return { uid: userRecord.uid, displayName };
}

export async function removeMemberAdmin(
  circleId: string,
  targetUid: string,
  currentUserUid: string
): Promise<void> {
  await assertOrganizer(circleId, currentUserUid);
  if (targetUid === currentUserUid) {
    throw new Error('自分自身を削除することはできません');
  }
  await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(targetUid)
    .delete();
}

export async function updateMemberRoleAdmin(
  circleId: string,
  targetUid: string,
  newRole: 'organizer' | 'member',
  currentUserUid: string
): Promise<void> {
  await assertOrganizer(circleId, currentUserUid);
  await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(targetUid)
    .update({ role: newRole });
}

// =====================
// 出欠管理
// =====================

export interface AttendeeInputAdmin {
  id: string;
  isGuest: boolean;
  attended: boolean;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  uid?: string;
  guestId?: string;
}

/**
 * イベントの出欠をまとめて記録する（Admin SDK バッチ書き込み）。
 * 参加者には未払い支払いレコードも自動生成する。
 */
export async function recordAttendanceAdmin(
  circleId: string,
  eventId: string,
  attendees: AttendeeInputAdmin[],
  currentUserUid: string
): Promise<void> {
  await assertOrganizer(circleId, currentUserUid);

  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();
  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = eventSnap.data()?.fee as number;

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
      attendanceData.guestId = attendee.guestId;
    } else if (!attendee.isGuest && attendee.uid) {
      attendanceData.uid = attendee.uid;
    }
    if (attendee.email) attendanceData.email = attendee.email;
    if (attendee.photoURL !== undefined) attendanceData.photoURL = attendee.photoURL;

    batch.set(attendanceRef, attendanceData);

    // 参加者のみ支払いレコードを自動生成（既存レコードは上書きしない）
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
        paymentData.guestId = attendee.guestId;
      } else if (!attendee.isGuest && attendee.uid) {
        paymentData.uid = attendee.uid;
      }
      if (attendee.email) paymentData.email = attendee.email;

      batch.set(paymentRef, paymentData, { merge: false });
    }
  }

  await batch.commit();
}

/**
 * QRコードスキャンによる個別チェックイン（Admin SDK）。
 * 幹事がメンバーのQRコードを読み取り、出欠と支払いレコードを記録する。
 */
export async function qrCheckInAdmin(
  circleId: string,
  eventId: string,
  memberUid: string,
  currentUserUid: string
): Promise<{ success: boolean; displayName: string }> {
  await assertOrganizer(circleId, currentUserUid);

  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(memberUid)
    .get();
  if (!memberSnap.exists) throw new Error('このサークルのメンバーではありません');
  const memberData = memberSnap.data()!;

  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();
  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = eventSnap.data()?.fee as number;

  // 既にチェックイン済みか確認
  const existingSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('attendance')
    .doc(memberUid)
    .get();

  if (existingSnap.exists && existingSnap.data()?.attended === true) {
    return { success: false, displayName: memberData.displayName as string };
  }

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

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
    displayName: memberData.displayName,
    email: memberData.email || '',
    photoURL: memberData.photoURL || null,
  });

  const paymentRef = adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('payments')
    .doc(memberUid);

  batch.set(
    paymentRef,
    {
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
      displayName: memberData.displayName,
      email: memberData.email || '',
    },
    { merge: false }
  );

  await batch.commit();
  return { success: true, displayName: memberData.displayName as string };
}
