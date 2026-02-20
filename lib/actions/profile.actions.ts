'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * ユーザーのプロフィール（表示名・アバター画像URL）をバッチ更新する。
 *
 * - `users/{uid}` ドキュメントを更新
 * - 所属する全サークルの `circles/{circleId}/members/{uid}` も同期更新
 *
 * Timestamp はサーバー側で設定し、クライアントへは渡さない。
 */
export async function updateProfileBatch(
  uid: string,
  updates: { displayName?: string; photoURL?: string | null }
): Promise<void> {
  if (!updates.displayName && updates.photoURL === undefined) return;

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  // --- users/{uid} を更新 ---
  const userRef = adminDb.collection('users').doc(uid);
  const userUpdates: Record<string, unknown> = { updatedAt: now };
  if (updates.displayName !== undefined) userUpdates.displayName = updates.displayName;
  if (updates.photoURL !== undefined) userUpdates.photoURL = updates.photoURL;
  batch.update(userRef, userUpdates);

  // --- 所属サークルの members/{uid} を全件同期更新 ---
  // collectionGroup クエリで全サークルのメンバードキュメントを取得
  const membersSnap = await adminDb
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  const memberUpdates: Record<string, unknown> = {};
  if (updates.displayName !== undefined) memberUpdates.displayName = updates.displayName;
  if (updates.photoURL !== undefined) memberUpdates.photoURL = updates.photoURL;

  for (const memberDoc of membersSnap.docs) {
    batch.update(memberDoc.ref, memberUpdates);
  }

  await batch.commit();
}
