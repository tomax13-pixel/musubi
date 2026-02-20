'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * displayName と photoURL を
 *   - users/{uid}
 *   - 所属するすべての circles/{circleId}/members/{uid}
 * に対して adminDb.batch() で一括同期更新する。
 */
export async function updateProfileBatch(params: {
  uid: string;
  displayName: string;
  photoURL: string | null;
}): Promise<{ success: boolean }> {
  const { uid, displayName, photoURL } = params;

  // 所属サークルのメンバードキュメントを collectionGroup で取得
  const memberSnaps = await adminDb
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  const batch = adminDb.batch();

  // users/{uid} を更新
  const userRef = adminDb.collection('users').doc(uid);
  batch.update(userRef, {
    displayName,
    photoURL: photoURL ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 各サークルのメンバードキュメントを更新
  for (const memberDoc of memberSnaps.docs) {
    batch.update(memberDoc.ref, {
      displayName,
      photoURL: photoURL ?? null,
    });
  }

  await batch.commit();

  return { success: true };
}
