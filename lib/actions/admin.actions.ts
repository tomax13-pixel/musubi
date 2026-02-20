'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { CircleMember } from '@/lib/types/models';

// ==============================
// Serialization Utility
// ==============================

/**
 * Firestore Admin Timestamp や Date を ISO 文字列に再帰変換する。
 * Server Actions から Client へデータを渡す際の "Only plain objects" エラーを防ぐ。
 */
export function serializeDoc<T extends Record<string, unknown>>(doc: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = serializeDoc(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// ==============================
// Circle Creation (Admin SDK)
// ==============================

interface CreateCircleAdminInput {
  name: string;
  emoji: string;
  description: string;
  createdByUid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export async function createCircleAdmin(
  input: CreateCircleAdminInput
): Promise<{ circleId: string }> {
  const circleRef = adminDb.collection('circles').doc();
  const memberRef = adminDb
    .collection('circles')
    .doc(circleRef.id)
    .collection('members')
    .doc(input.createdByUid);

  const batch = adminDb.batch();

  batch.set(circleRef, {
    name: input.name,
    emoji: input.emoji || '',
    description: input.description,
    createdBy: input.createdByUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(memberRef, {
    uid: input.createdByUid,
    role: 'organizer',
    joinedAt: FieldValue.serverTimestamp(),
    displayName: input.displayName,
    email: input.email,
    photoURL: input.photoURL ?? null,
  });

  await batch.commit();

  return { circleId: circleRef.id };
}

// ==============================
// Attendance Recording (Admin SDK)
// ==============================

export interface AttendeeInputAdmin {
  id: string; // uid (member) or guestId (guest)
  isGuest: boolean;
  attended: boolean;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  uid?: string;
  guestId?: string;
}

export async function recordAttendanceAdmin(
  circleId: string,
  eventId: string,
  attendees: AttendeeInputAdmin[],
  organizerUid: string
): Promise<void> {
  // Verify organizer role via Admin SDK
  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(organizerUid)
    .get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'organizer') {
    throw new Error('オーガナイザーのみ出欠を記録できます');
  }

  // Fetch event fee
  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();
  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = (eventSnap.data()!.fee as number) ?? 0;

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
      checkedInBy: organizerUid,
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

      batch.set(paymentRef, paymentData);
    }
  }

  await batch.commit();
}

// ==============================
// QR Check-In (Admin SDK)
// ==============================

export async function qrCheckInAdmin(
  circleId: string,
  eventId: string,
  memberUid: string,
  checkedInByUid: string
): Promise<{ success: boolean; displayName: string }> {
  // Verify checkedInBy is organizer
  const organizerSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(checkedInByUid)
    .get();
  if (!organizerSnap.exists || organizerSnap.data()?.role !== 'organizer') {
    throw new Error('オーガナイザーのみチェックインを実行できます');
  }

  // Verify member exists
  const memberSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .doc(memberUid)
    .get();
  if (!memberSnap.exists) throw new Error('このサークルのメンバーではありません');
  const memberData = memberSnap.data()!;

  // Fetch event fee
  const eventSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .get();
  if (!eventSnap.exists) throw new Error('イベントが見つかりません');
  const fee = (eventSnap.data()!.fee as number) ?? 0;

  // Duplicate guard
  const existingSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('events')
    .doc(eventId)
    .collection('attendance')
    .doc(memberUid)
    .get();
  if (existingSnap.exists && existingSnap.data()?.attended) {
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
    checkedInBy: checkedInByUid,
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
  });

  await batch.commit();

  return { success: true, displayName: memberData.displayName as string };
}

// ==============================
// Member List (Admin SDK)
// ==============================

export async function getCircleMembersAdmin(
  circleId: string
): Promise<(Omit<CircleMember, 'joinedAt'> & { joinedAt: string })[]> {
  const snap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('members')
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return serializeDoc({
      uid: data.uid as string,
      role: data.role as CircleMember['role'],
      joinedAt: data.joinedAt,
      displayName: data.displayName as string,
      email: data.email as string,
      photoURL: (data.photoURL ?? null) as string | null,
    }) as Omit<CircleMember, 'joinedAt'> & { joinedAt: string };
  });
}
