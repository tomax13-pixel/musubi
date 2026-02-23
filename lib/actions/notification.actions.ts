'use server';

import { adminDb, adminMessaging } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';
import { getCurrentUserRoleAdmin } from './admin.actions';

// =====================
// 型定義
// =====================

export type NotificationType = 'event_created' | 'payment_reminder' | 'attendance_reminder';

interface SendResult {
    successCount: number;
    failureCount: number;
}

// =====================
// 内部ユーティリティ
// =====================

/** サークルの全メンバーのFCMトークンを収集する */
async function getMemberTokens(circleId: string): Promise<{ uid: string; tokens: string[] }[]> {
    const membersSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('members')
        .get();

    const results: { uid: string; tokens: string[] }[] = [];

    for (const memberDoc of membersSnap.docs) {
        const uid = memberDoc.id;
        const userSnap = await adminDb.collection('users').doc(uid).get();
        const fcmTokens: string[] = userSnap.data()?.fcmTokens ?? [];
        if (fcmTokens.length > 0) {
            results.push({ uid, tokens: fcmTokens });
        }
    }

    return results;
}

/** 通知ログを Firestore に書き込む */
async function writeNotificationLog(params: {
    circleId: string;
    eventId?: string;
    recipientUid: string;
    type: NotificationType;
    sentBy: string;
    title: string;
    body: string;
    success: boolean;
    error?: string;
}) {
    await adminDb.collection('notificationLogs').add({
        circleId: params.circleId,
        eventId: params.eventId ?? '',
        recipientUid: params.recipientUid,
        type: params.type,
        sentAt: FieldValue.serverTimestamp(),
        sentBy: params.sentBy,
        title: params.title,
        body: params.body,
        success: params.success,
        error: params.error ?? null,
    });
}

/** FCM マルチキャスト送信を実行し、ログを保存する */
async function sendAndLog(params: {
    memberTokens: { uid: string; tokens: string[] }[];
    title: string;
    body: string;
    type: NotificationType;
    circleId: string;
    eventId?: string;
    sentBy: string;
    data?: Record<string, string>;
}): Promise<SendResult> {
    let successCount = 0;
    let failureCount = 0;

    for (const { uid, tokens } of params.memberTokens) {
        if (tokens.length === 0) continue;

        try {
            const response = await adminMessaging.sendEachForMulticast({
                tokens,
                notification: {
                    title: params.title,
                    body: params.body,
                },
                data: {
                    circleId: params.circleId,
                    eventId: params.eventId ?? '',
                    type: params.type,
                    ...params.data,
                },
                webpush: {
                    notification: {
                        icon: '/icon-192.svg',
                        requireInteraction: false,
                    },
                    fcmOptions: {
                        link: params.eventId
                            ? `/circles/${params.circleId}/events/${params.eventId}/payments`
                            : `/circles/${params.circleId}`,
                    },
                },
            });

            const memberSuccess = response.responses.filter((r) => r.success).length;
            const memberFailure = response.responses.filter((r) => !r.success).length;

            if (memberSuccess > 0) successCount++;
            if (memberFailure > 0) failureCount++;

            await writeNotificationLog({
                circleId: params.circleId,
                eventId: params.eventId,
                recipientUid: uid,
                type: params.type,
                sentBy: params.sentBy,
                title: params.title,
                body: params.body,
                success: memberSuccess > 0,
                error: memberFailure > 0 ? '一部のデバイスへの送信に失敗しました' : undefined,
            });
        } catch (err) {
            failureCount++;
            await writeNotificationLog({
                circleId: params.circleId,
                eventId: params.eventId,
                recipientUid: uid,
                type: params.type,
                sentBy: params.sentBy,
                title: params.title,
                body: params.body,
                success: false,
                error: err instanceof Error ? err.message : '不明なエラー',
            });
        }
    }

    return { successCount, failureCount };
}

// =====================
// 公開 Server Actions
// =====================

/**
 * 全メンバーにカスタム通知を送る（手動送信）
 * 幹事のみ実行可能
 */
export async function sendNotificationToAllMembers(
    circleId: string,
    type: NotificationType,
    title: string,
    body: string,
    currentUserUid: string,
    eventId?: string
): Promise<SendResult> {
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (role !== 'organizer') throw new Error('幹事のみ通知を送れます');

    const memberTokens = await getMemberTokens(circleId);

    return sendAndLog({
        memberTokens,
        title,
        body,
        type,
        circleId,
        eventId,
        sentBy: currentUserUid,
    });
}

/**
 * 未払いメンバーに支払いリマインダーを送る（手動送信）
 * 幹事のみ実行可能
 */
export async function sendPaymentReminder(
    circleId: string,
    eventId: string,
    currentUserUid: string,
    customTitle?: string,
    customBody?: string
): Promise<SendResult> {
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (role !== 'organizer') throw new Error('幹事のみ通知を送れます');

    // イベント情報を取得
    const eventSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .get();
    if (!eventSnap.exists) throw new Error('イベントが見つかりません');
    const eventName = eventSnap.data()?.name ?? 'イベント';

    // 未払いメンバーを取得
    const paymentsSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('payments')
        .where('status', '==', 'unpaid')
        .where('isGuest', '==', false)
        .get();

    const unpaidUids = paymentsSnap.docs.map((d) => d.id);

    if (unpaidUids.length === 0) return { successCount: 0, failureCount: 0 };

    const title = customTitle ?? `💰 お支払いのお願い`;
    const body = customBody ?? `「${eventName}」の参加費がまだ未払いです。確認をお願いします。`;

    // トークン収集（未払いメンバーのみ）
    const memberTokens: { uid: string; tokens: string[] }[] = [];
    for (const uid of unpaidUids) {
        const userSnap = await adminDb.collection('users').doc(uid).get();
        const fcmTokens: string[] = userSnap.data()?.fcmTokens ?? [];
        if (fcmTokens.length > 0) {
            memberTokens.push({ uid, tokens: fcmTokens });
        }
    }

    return sendAndLog({
        memberTokens,
        title,
        body,
        type: 'payment_reminder',
        circleId,
        eventId,
        sentBy: currentUserUid,
    });
}

/**
 * 出欠未回答メンバーに出欠確認リマインダーを送る（手動送信）
 * 幹事のみ実行可能
 */
export async function sendAttendanceReminder(
    circleId: string,
    eventId: string,
    currentUserUid: string,
    customTitle?: string,
    customBody?: string
): Promise<SendResult> {
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (role !== 'organizer') throw new Error('幹事のみ通知を送れます');

    const eventSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .get();
    if (!eventSnap.exists) throw new Error('イベントが見つかりません');
    const eventName = eventSnap.data()?.name ?? 'イベント';

    // 出欠記録済みのUIDを取得
    const attendanceSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('attendance')
        .where('isGuest', '==', false)
        .get();
    const respondedUids = new Set(attendanceSnap.docs.map((d) => d.id));

    // 全メンバーを取得し、未回答者を抽出
    const membersSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('members')
        .get();

    const notRespondedUids = membersSnap.docs
        .map((d) => d.id)
        .filter((uid) => !respondedUids.has(uid));

    if (notRespondedUids.length === 0) return { successCount: 0, failureCount: 0 };

    const title = customTitle ?? `📋 出欠確認のお願い`;
    const body = customBody ?? `「${eventName}」の出欠がまだ未回答です。ご回答をお願いします。`;

    const memberTokens: { uid: string; tokens: string[] }[] = [];
    for (const uid of notRespondedUids) {
        const userSnap = await adminDb.collection('users').doc(uid).get();
        const fcmTokens: string[] = userSnap.data()?.fcmTokens ?? [];
        if (fcmTokens.length > 0) {
            memberTokens.push({ uid, tokens: fcmTokens });
        }
    }

    return sendAndLog({
        memberTokens,
        title,
        body,
        type: 'attendance_reminder',
        circleId,
        eventId,
        sentBy: currentUserUid,
    });
}

/**
 * イベント作成時に全メンバーへ自動通知する（内部用・幹事チェックなし）
 * createEventAdmin() から呼び出す
 */
export async function notifyEventCreated(
    circleId: string,
    eventId: string,
    eventName: string,
    sentByUid: string
): Promise<void> {
    const memberTokens = await getMemberTokens(circleId);

    const title = `🎉 新しいイベントが追加されました`;
    const body = `「${eventName}」が作成されました。詳細を確認してください。`;

    await sendAndLog({
        memberTokens,
        title,
        body,
        type: 'event_created',
        circleId,
        eventId,
        sentBy: sentByUid,
    });
}

/**
 * 通知ログを取得する
 */
export async function getNotificationLogs(
    circleId: string,
    currentUserUid: string,
    eventId?: string
) {
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (role !== 'organizer') throw new Error('幹事のみ通知履歴を確認できます');

    let query = adminDb
        .collection('notificationLogs')
        .where('circleId', '==', circleId)
        .orderBy('sentAt', 'desc')
        .limit(50);

    if (eventId) {
        query = adminDb
            .collection('notificationLogs')
            .where('circleId', '==', circleId)
            .where('eventId', '==', eventId)
            .orderBy('sentAt', 'desc')
            .limit(50);
    }

    const snap = await query.get();
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            circleId: data.circleId,
            eventId: data.eventId,
            recipientUid: data.recipientUid,
            type: data.type,
            sentAt: data.sentAt?.toDate().toISOString() ?? null,
            sentBy: data.sentBy,
            title: data.title,
            body: data.body,
            success: data.success,
            error: data.error ?? null,
        };
    });
}
