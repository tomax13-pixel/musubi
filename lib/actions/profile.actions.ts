'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import * as admin from 'firebase-admin';
import { revalidatePath } from 'next/cache';
import { serializeDoc } from '@/lib/utils/serialize';

/**
 * ユーザープロフィールを更新し、所属する全サークルのメンバー情報も同期更新する
 * (Admin SDKを使用するため、権限エラーを回避可能)
 */
export async function updateUserProfileAdmin(
    uid: string,
    data: { displayName: string; photoURL: string | null }
) {
    if (!uid) throw new Error('User ID is required');
    if (!data.displayName) throw new Error('Display name is required');

    const batch = adminDb.batch();

    // 1. users/{uid} の更新
    const userRef = adminDb.collection('users').doc(uid);
    batch.update(userRef, {
        displayName: data.displayName,
        photoURL: data.photoURL,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. 所属する全サークルのメンバー情報 (circles/{circleId}/members/{uid}) を検索
    // Collection Group Query を使用して、サブコレクション 'members' 内の該当ユーザーを全て取得
    const membersQuery = adminDb.collectionGroup('members').where('uid', '==', uid);
    const membersSnapshot = await membersQuery.get();

    // 3. 検索されたメンバー情報を一括更新
    membersSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            displayName: data.displayName,
            photoURL: data.photoURL,
            // メンバー情報の更新日時も更新した方が親切だが、必須ではない
            // updatedAt: admin.firestore.FieldValue.serverTimestamp(), 
        });
    });

    // 4. バッチコミット
    await batch.commit();

    // 5. キャッシュの再検証
    revalidatePath('/dashboard');
    revalidatePath('/mypage');

    // 影響を受けるサークルのパスも再検証 (本来はループで回すべきだが、数が多いとコストになるため代表的なものだけ)
    // 厳密には `circles/${circleId}/members` を全てrevalidateすべきだが、
    // Next.jsのキャッシュ戦略上、ページアクセス時に再取得されることを期待。
    // 必要であれば membersSnapshot から circleId を抽出してループで revalidatePath を呼ぶ。

    const impactedCircleIds = new Set<string>();
    membersSnapshot.docs.forEach(doc => {
        // doc.ref.parent.parent is the circle document
        const circleId = doc.ref.parent.parent?.id;
        if (circleId) impactedCircleIds.add(circleId);
    });

    impactedCircleIds.forEach(circleId => {
        revalidatePath(`/circles/${circleId}/members`);
        revalidatePath(`/circles/${circleId}`);
    });

    return serializeDoc({ success: true });
}
