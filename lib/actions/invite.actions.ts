'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { serializeDoc } from '@/lib/utils/serialize';

// ランダムな6文字の招待コードを生成
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * 招待コードを生成（幹事のみ）
 * 既存の有効なコードがあればそれを返す
 */
export async function createInviteCode(circleId: string, uid: string) {
    // 幹事チェック
    const memberDoc = await adminDb
        .collection('circles').doc(circleId)
        .collection('members').doc(uid)
        .get();

    if (!memberDoc.exists || memberDoc.data()?.role !== 'organizer') {
        throw new Error('オーガナイザーのみ招待リンクを作成できます');
    }

    // 既存の有効なコードがあるか確認
    const now = Timestamp.now();
    const existingSnap = await adminDb
        .collection('circles').doc(circleId)
        .collection('invites')
        .where('isActive', '==', true)
        .where('expiresAt', '>', now)
        .limit(1)
        .get();

    if (!existingSnap.empty) {
        const doc = existingSnap.docs[0];
        if (doc) {
            return {
                code: doc.data().code as string,
                expiresAt: doc.data().expiresAt?.toDate().toISOString() ?? null,
            };
        }
    }

    // 新しいコードを生成（重複チェック付き）
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
        // 全サークルで同じコードが使われていないか確認
        const dup = await adminDb
            .collectionGroup('invites')
            .where('code', '==', code)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (dup.empty) break;
        code = generateCode();
        attempts++;
    }

    // 7日後に期限切れ
    const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    const inviteRef = adminDb
        .collection('circles').doc(circleId)
        .collection('invites').doc();

    await inviteRef.set({
        circleId,
        code,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
        isActive: true,
    });

    return {
        code,
        expiresAt: expiresAt.toDate().toISOString(),
    };
}

/**
 * 招待コードからサークル情報を取得（ログイン不要な情報のみ返す）
 */
export async function getInviteInfo(code: string) {
    // collectionGroup で全サークルの invites から検索
    const snap = await adminDb
        .collectionGroup('invites')
        .where('code', '==', code)
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snap.empty) {
        return { valid: false, error: 'この招待リンクは無効です' };
    }

    const inviteDoc = snap.docs[0];
    if (!inviteDoc) {
        return { valid: false, error: 'この招待リンクは無効です' };
    }
    const inviteData = inviteDoc.data();

    // 期限切れチェック
    const expiresAt = inviteData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
        return { valid: false, error: 'この招待リンクは期限切れです' };
    }

    // サークル情報を取得
    const circleId = inviteData.circleId;
    const circleSnap = await adminDb.collection('circles').doc(circleId).get();

    if (!circleSnap.exists) {
        return { valid: false, error: 'サークルが見つかりません' };
    }

    const circleData = circleSnap.data();

    // メンバー数を取得
    const membersSnap = await adminDb
        .collection('circles').doc(circleId)
        .collection('members')
        .get();

    return {
        valid: true,
        circleId,
        circleName: circleData?.name ?? '',
        circleEmoji: circleData?.emoji ?? '',
        circleDescription: circleData?.description ?? '',
        memberCount: membersSnap.size,
    };
}

/**
 * 招待コードを使ってサークルに参加
 */
export async function joinCircleByInvite(
    code: string,
    user: { uid: string; displayName: string; email: string; photoURL: string | null }
) {
    // コードの検証
    const snap = await adminDb
        .collectionGroup('invites')
        .where('code', '==', code)
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snap.empty) {
        throw new Error('この招待リンクは無効です');
    }

    const inviteDoc = snap.docs[0];
    if (!inviteDoc) {
        throw new Error('この招待リンクは無効です');
    }
    const inviteData = inviteDoc.data();

    // 期限切れチェック
    const expiresAt = inviteData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
        throw new Error('この招待リンクは期限切れです');
    }

    const circleId = inviteData.circleId;

    // 既にメンバーかチェック
    const memberRef = adminDb
        .collection('circles').doc(circleId)
        .collection('members').doc(user.uid);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
        // 既にメンバーならエラーにせず、circleId を返す
        return { circleId, alreadyMember: true };
    }

    // users ドキュメントが存在しない場合は作成
    const userRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        await userRef.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            fcmTokens: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    // メンバーに追加
    await memberRef.set({
        uid: user.uid,
        role: 'member',
        joinedAt: FieldValue.serverTimestamp(),
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
    });

    return { circleId, alreadyMember: false };
}
