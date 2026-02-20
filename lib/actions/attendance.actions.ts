'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AttendanceRecord, PaymentRecord } from '@/lib/types/models';
import { getCurrentUserRole } from './circle.actions';

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

export async function recordAttendance(
  circleId: string,
  eventId: string,
  attendees: AttendeeInput[],
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみ出欠を記録できます');

  // Get event to retrieve fee
  const eventSnap = await getDoc(doc(db, 'circles', circleId, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('イベントが見つかりません');
  const eventData = eventSnap.data();
  const fee = eventData.fee as number;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const attendee of attendees) {
    // Write attendance record
    const attendanceRef = doc(
      db,
      'circles', circleId,
      'events', eventId,
      'attendance', attendee.id
    );

    const attendanceData: Partial<AttendanceRecord> = {
      eventId,
      circleId,
      isGuest: attendee.isGuest,
      attended: attendee.attended,
      checkedInAt: attendee.attended ? (now as unknown as import('firebase/firestore').Timestamp) : null,
      checkedInBy: currentUserUid,
      displayName: attendee.displayName,
    };

    // Only set uid or guestId, not both (avoid undefined)
    if (attendee.isGuest && attendee.guestId) {
      attendanceData.guestId = attendee.guestId;
    } else if (!attendee.isGuest && attendee.uid) {
      attendanceData.uid = attendee.uid;
    }

    // Only set optional fields if they exist
    if (attendee.email) attendanceData.email = attendee.email;
    if (attendee.photoURL !== undefined) attendanceData.photoURL = attendee.photoURL;

    batch.set(attendanceRef, attendanceData);

    // If attended, create/update payment record with 'unpaid' status
    if (attendee.attended) {
      const paymentRef = doc(
        db,
        'circles', circleId,
        'events', eventId,
        'payments', attendee.id
      );

      const paymentData: Partial<PaymentRecord> = {
        eventId,
        circleId,
        isGuest: attendee.isGuest,
        amount: fee,
        status: 'unpaid',
        markedPaidAt: null,
        confirmedAt: null,
        createdAt: now as unknown as import('firebase/firestore').Timestamp,
        updatedAt: now as unknown as import('firebase/firestore').Timestamp,
        displayName: attendee.displayName,
      };

      // Only set uid or guestId, not both (avoid undefined)
      if (attendee.isGuest && attendee.guestId) {
        paymentData.guestId = attendee.guestId;
      } else if (!attendee.isGuest && attendee.uid) {
        paymentData.uid = attendee.uid;
      }

      // Only set email if it exists
      if (attendee.email) paymentData.email = attendee.email;

      // Use merge so re-recording attendance doesn't overwrite confirmed payments
      batch.set(paymentRef, paymentData as Omit<PaymentRecord, 'id'>, { merge: false });
    }
  }

  await batch.commit();
}

export async function getAttendanceForEvent(
  circleId: string,
  eventId: string
): Promise<AttendanceRecord[]> {
  const snap = await getDocs(
    collection(db, 'circles', circleId, 'events', eventId, 'attendance')
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

/**
 * QRコードスキャンによる個別チェックイン
 * 幹事がメンバーのQRコードを読み取り、出欠を記録する
 */
export async function qrCheckIn(
  circleId: string,
  eventId: string,
  memberUid: string,
  currentUserUid: string
): Promise<{ success: boolean; displayName: string }> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみチェックインを実行できます');

  // メンバーであることを確認
  const memberSnap = await getDoc(doc(db, 'circles', circleId, 'members', memberUid));
  if (!memberSnap.exists()) throw new Error('このサークルのメンバーではありません');
  const memberData = memberSnap.data();

  // イベント情報を取得（参加費）
  const eventSnap = await getDoc(doc(db, 'circles', circleId, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('イベントが見つかりません');
  const eventData = eventSnap.data();
  const fee = eventData.fee as number;

  // 既にチェックイン済みか確認
  const existingSnap = await getDoc(
    doc(db, 'circles', circleId, 'events', eventId, 'attendance', memberUid)
  );
  if (existingSnap.exists() && existingSnap.data().attended) {
    return { success: false, displayName: memberData.displayName };
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  // 出欠記録
  const attendanceRef = doc(
    db, 'circles', circleId, 'events', eventId, 'attendance', memberUid
  );
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

  // 支払い記録を自動生成
  const paymentRef = doc(
    db, 'circles', circleId, 'events', eventId, 'payments', memberUid
  );
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
    displayName: memberData.displayName,
    email: memberData.email || '',
  }, { merge: false });

  await batch.commit();

  return { success: true, displayName: memberData.displayName };
}
