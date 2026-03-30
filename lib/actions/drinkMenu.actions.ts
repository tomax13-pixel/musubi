'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeDoc } from '@/lib/utils/serialize';
import { getCurrentUserRoleAdmin } from '@/lib/actions/admin.actions';
import type { DrinkMenuItem, DrinkCategory } from '@/lib/types/models';

// =====================
// Read
// =====================

/** サークルの有効なドリンクメニューを取得（カテゴリ+sortOrder順） */
export async function getDrinkMenu(circleId: string): Promise<DrinkMenuItem[]> {
  const snapshot = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('drinkMenu')
    .where('isActive', '==', true)
    .orderBy('category')
    .orderBy('sortOrder')
    .get();

  return snapshot.docs.map((doc) =>
    serializeDoc<DrinkMenuItem>({ id: doc.id, ...doc.data() })
  );
}

// =====================
// Write (organizer only)
// =====================

/** ドリンクメニューにアイテムを追加 */
export async function addDrinkMenuItemAdmin(
  circleId: string,
  input: { name: string; price: number; category: DrinkCategory },
  currentUserUid: string
): Promise<string> {
  const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('幹事のみメニューを編集できます');

  const name = input.name.trim();
  if (!name || name.length > 50) throw new Error('名前は1〜50文字で入力してください');
  if (!Number.isInteger(input.price) || input.price < 1) throw new Error('金額は1円以上の整数で入力してください');

  // sortOrder: タイムスタンプベースで末尾に追加（複合インデックス不要）
  const nextOrder = Date.now();

  const docRef = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('drinkMenu')
    .add({
      name,
      price: input.price,
      category: input.category,
      sortOrder: nextOrder,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  revalidatePath(`/circles/${circleId}/menu`);
  return docRef.id;
}

/** ドリンクメニューのアイテムを更新 */
export async function updateDrinkMenuItemAdmin(
  circleId: string,
  itemId: string,
  updates: { name?: string; price?: number; category?: DrinkCategory; sortOrder?: number },
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('幹事のみメニューを編集できます');

  const data: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name || name.length > 50) throw new Error('名前は1〜50文字で入力してください');
    data.name = name;
  }
  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || updates.price < 1) throw new Error('金額は1円以上の整数で入力してください');
    data.price = updates.price;
  }
  if (updates.category !== undefined) data.category = updates.category;
  if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;

  await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('drinkMenu')
    .doc(itemId)
    .update(data);

  revalidatePath(`/circles/${circleId}/menu`);
}

/** ドリンクメニューのアイテムを削除（ソフト削除） */
export async function deleteDrinkMenuItemAdmin(
  circleId: string,
  itemId: string,
  currentUserUid: string
): Promise<void> {
  const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('幹事のみメニューを編集できます');

  await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('drinkMenu')
    .doc(itemId)
    .update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

  revalidatePath(`/circles/${circleId}/menu`);
}
