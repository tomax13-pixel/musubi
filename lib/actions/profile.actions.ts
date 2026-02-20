'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/adminApp';

// ============================================================
// プロフィール一括バッチ更新
// users/{uid} と 全サークルの circles/{circleId}/members/{uid} を
// db.batch() で同時に更新する
// ============================================================

export async function updateProfileBatch(
  uid: string,
  data: {
    displayName?: string;
    photoURL?: string | null;
  }
): Promise<void> {
  // 更新するフィールドが空の場合は何もしない
  if (!data.displayName && data.photoURL === undefined) return;

  // 全サークルのメンバードキュメントを collectionGroup で取得
  const memberSnaps = await adminDb
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  const batch = adminDb.batch();

  // users/{uid} を更新
  const userRef = adminDb.collection('users').doc(uid);
  batch.update(userRef, {
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 各サークルの members/{uid} を更新
  for (const memberDoc of memberSnaps.docs) {
    batch.update(memberDoc.ref, data);
  }

  await batch.commit();
}
