'use client';

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Guest, AddGuestInput } from '@/lib/types/models';
import { getCurrentUserRole } from './circle.actions';

export async function addGuest(
  circleId: string,
  input: AddGuestInput,
  currentUserUid: string
): Promise<string> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみゲストを追加できます');

  const guestRef = await addDoc(collection(db, 'circles', circleId, 'guests'), {
    circleId,
    name: input.name,
    email: input.email ?? null,
    phoneNumber: input.phoneNumber ?? null,
    notes: input.notes ?? null,
    addedBy: currentUserUid,
    addedAt: serverTimestamp(),
    isActive: true,
  });

  return guestRef.id;
}

export async function getActiveGuests(circleId: string): Promise<Guest[]> {
  const q = query(
    collection(db, 'circles', circleId, 'guests'),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Guest));
}

export async function deactivateGuest(
  circleId: string,
  guestId: string,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみゲストを削除できます');

  await updateDoc(doc(db, 'circles', circleId, 'guests', guestId), {
    isActive: false,
  });
}

export async function updateGuest(
  circleId: string,
  guestId: string,
  input: Partial<AddGuestInput>,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみ編集できます');

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phoneNumber !== undefined) updates.phoneNumber = input.phoneNumber;
  if (input.notes !== undefined) updates.notes = input.notes;

  await updateDoc(doc(db, 'circles', circleId, 'guests', guestId), updates);
}
