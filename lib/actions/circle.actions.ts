'use client';

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Circle, CircleMember, CreateCircleInput, UserProfile } from '@/lib/types/models';

export async function createCircle(
  input: CreateCircleInput,
  currentUser: { uid: string; displayName: string; email: string; photoURL: string | null }
): Promise<string> {
  const circleRef = await addDoc(collection(db, 'circles'), {
    name: input.name,
    emoji: input.emoji || '',
    description: input.description,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Creator becomes organizer
  const memberRef = doc(db, 'circles', circleRef.id, 'members', currentUser.uid);
  await setDoc(memberRef, {
    uid: currentUser.uid,
    role: 'organizer',
    joinedAt: serverTimestamp(),
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoURL: currentUser.photoURL,
  } satisfies Omit<CircleMember, 'uid'> & { uid: string });

  return circleRef.id;
}

export async function getCirclesForUser(uid: string): Promise<Circle[]> {
  // Query circles where user is a member via collectionGroup
  const membersQuery = query(
    collection(db, 'circles'),
    // We can't query across subcollections directly with a simple query
    // So we query all circles and filter by membership in a separate step
    // For MVP, fetch all circles where createdBy is user, then merge with membership
    orderBy('createdAt', 'desc')
  );

  // Alternative: store circleIds in user profile for faster lookup
  // For MVP simplicity: fetch all circles and check membership
  const userDoc = await getDoc(doc(db, 'users', uid));
  const userData = userDoc.data() as UserProfile | undefined;

  if (!userData) return [];

  // Get all circles where user is a member using collectionGroup query
  const { collectionGroup } = await import('firebase/firestore');
  const memberQuery = query(collectionGroup(db, 'members'), where('uid', '==', uid));
  const memberSnaps = await getDocs(memberQuery);

  const circleIds = memberSnaps.docs.map((d) => d.ref.parent.parent!.id);

  if (circleIds.length === 0) return [];

  // Fetch each circle (Firestore 'in' supports up to 30 items)
  const circles: Circle[] = [];
  for (const id of circleIds) {
    const circleSnap = await getDoc(doc(db, 'circles', id));
    if (circleSnap.exists()) {
      circles.push({ id: circleSnap.id, ...circleSnap.data() } as Circle);
    }
  }

  return circles.sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );
}

export async function getCircle(circleId: string): Promise<Circle | null> {
  const snap = await getDoc(doc(db, 'circles', circleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Circle;
}

export async function getCircleMembers(circleId: string): Promise<CircleMember[]> {
  const snap = await getDocs(collection(db, 'circles', circleId, 'members'));
  return snap.docs.map((d) => ({ ...d.data() } as CircleMember));
}

export async function getCurrentUserRole(
  circleId: string,
  uid: string
): Promise<'organizer' | 'member' | null> {
  const memberSnap = await getDoc(doc(db, 'circles', circleId, 'members', uid));
  if (!memberSnap.exists()) return null;
  return (memberSnap.data() as CircleMember).role;
}

export async function updateCircle(
  circleId: string,
  input: Partial<CreateCircleInput>,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRole(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('オーガナイザーのみ編集できます');

  await updateDoc(doc(db, 'circles', circleId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
