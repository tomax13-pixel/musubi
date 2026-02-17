'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { PaymentRecord } from '@/lib/types/models';
import { getCurrentUserRole } from './circle.actions';

export async function getPaymentsForEvent(
  circleId: string,
  eventId: string
): Promise<PaymentRecord[]> {
  const snap = await getDocs(
    collection(db, 'circles', circleId, 'events', eventId, 'payments')
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
}

/** Member marks their own payment as paid (pending organizer confirmation) */
export async function markAsPaid(
  circleId: string,
  eventId: string,
  currentUserUid: string
): Promise<void> {
  const paymentRef = doc(
    db,
    'circles', circleId,
    'events', eventId,
    'payments', currentUserUid
  );

  const snap = await getDoc(paymentRef);
  if (!snap.exists()) throw new Error('支払い記録が見つかりません');

  const data = snap.data() as PaymentRecord;
  if (data.status === 'confirmed') throw new Error('すでに確認済みです');

  await updateDoc(paymentRef, {
    status: 'pending_confirmation',
    markedPaidAt: serverTimestamp(),
    markedPaidBy: currentUserUid,
    updatedAt: serverTimestamp(),
  });
}

/** Organizer confirms payment received */
export async function confirmPayment(
  circleId: string,
  eventId: string,
  paymentId: string,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみ確認できます');

  const paymentRef = doc(
    db,
    'circles', circleId,
    'events', eventId,
    'payments', paymentId
  );

  await updateDoc(paymentRef, {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    confirmedBy: currentUserUid,
    updatedAt: serverTimestamp(),
  });
}

/** Organizer resets payment back to unpaid */
export async function resetPayment(
  circleId: string,
  eventId: string,
  paymentId: string,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみリセットできます');

  const paymentRef = doc(
    db,
    'circles', circleId,
    'events', eventId,
    'payments', paymentId
  );

  await updateDoc(paymentRef, {
    status: 'unpaid',
    markedPaidAt: null,
    markedPaidBy: null,
    confirmedAt: null,
    confirmedBy: null,
    updatedAt: serverTimestamp(),
  });
}
