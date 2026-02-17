'use client';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event, CreateEventInput } from '@/lib/types/models';
import { getCurrentUserRole } from './circle.actions';

export async function createEvent(
  circleId: string,
  input: CreateEventInput,
  currentUserUid: string
): Promise<string> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみイベントを作成できます');

  const eventRef = await addDoc(collection(db, 'circles', circleId, 'events'), {
    circleId,
    name: input.name,
    description: input.description,
    date: Timestamp.fromDate(input.date),
    location: input.location,
    fee: input.fee,
    createdBy: currentUserUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return eventRef.id;
}

export async function getEvent(circleId: string, eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, 'circles', circleId, 'events', eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

export async function getEventsForCircle(circleId: string): Promise<Event[]> {
  const q = query(
    collection(db, 'circles', circleId, 'events'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

export async function updateEvent(
  circleId: string,
  eventId: string,
  input: Partial<CreateEventInput>,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみ編集できます');

  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.date !== undefined) updateData.date = Timestamp.fromDate(input.date);
  if (input.location !== undefined) updateData.location = input.location;
  if (input.fee !== undefined) updateData.fee = input.fee;

  await updateDoc(doc(db, 'circles', circleId, 'events', eventId), updateData);
}
