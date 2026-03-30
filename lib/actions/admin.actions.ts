'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeDoc } from '@/lib/utils/serialize';
import { awardPointsWithResult, recalculateStreak, updateCircleLeaderboard } from '@/lib/actions/gamification.actions';
import type { GamificationResult } from '@/lib/types/gamification';
import { EMPTY_GAMIFICATION_RESULT, mergeGamificationResults } from '@/lib/types/gamification';

// Helper to check if user is organizer in a circle
export async function getCurrentUserRoleAdmin(circleId: string, uid: string): Promise<'organizer' | 'member' | null> {
    const memberDoc = await adminDb.collection('circles').doc(circleId).collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    return memberDoc.data()?.role;
}

async function isOrganizer(circleId: string, uid: string): Promise<boolean> {
    const role = await getCurrentUserRoleAdmin(circleId, uid);
    return role === 'organizer';
}

// Search user by email (Admin SDK - bypass rules)
export async function searchUserByEmailAdmin(email: string) {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    if (!userDoc) return null;

    return serializeDoc({
        uid: userDoc.id,
        ...userDoc.data(),
    });
}

export async function addMemberToCircleAdmin(
    circleId: string,
    userEmail: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみメンバーを追加できます');

    const targetUser = await searchUserByEmailAdmin(userEmail);
    if (!targetUser) throw new Error('このメールアドレスのユーザーが見つかりません');

    // Check if already a member
    const memberRef = adminDb.collection('circles').doc(circleId).collection('members').doc(targetUser.uid);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) throw new Error('このユーザーは既にサークルのメンバーです');

    await memberRef.set({
        uid: targetUser.uid,
        role: 'member',
        joinedAt: FieldValue.serverTimestamp(),
        displayName: targetUser.displayName,
        email: targetUser.email,
        photoURL: targetUser.photoURL,
    });

    revalidatePath(`/circles/${circleId}/members`);
    return targetUser.uid;
}

export async function promoteToOrganizerAdmin(
    circleId: string,
    targetUid: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみメンバーを昇格できます');

    const memberRef = adminDb.collection('circles').doc(circleId).collection('members').doc(targetUid);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) throw new Error('このユーザーはメンバーではありません');
    if (memberDoc.data()?.role === 'organizer') throw new Error('このメンバーは既にオーガナイザーです');

    await memberRef.update({
        role: 'organizer',
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/circles/${circleId}/members`);
}

export async function demoteToMemberAdmin(
    circleId: string,
    targetUid: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみメンバーを降格できます');

    if (targetUid === currentUserUid) throw new Error('自分自身は降格できません');

    const memberRef = adminDb.collection('circles').doc(circleId).collection('members').doc(targetUid);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) throw new Error('このユーザーはメンバーではありません');
    if (memberDoc.data()?.role === 'member') throw new Error('このメンバーは既にメンバーです');

    // Check absolute organizer count
    const membersRef = adminDb.collection('circles').doc(circleId).collection('members');
    const organizersSnapshot = await membersRef.where('role', '==', 'organizer').get();

    if (organizersSnapshot.size <= 1) throw new Error('最後のオーガナイザーは降格できません');

    await memberRef.update({
        role: 'member',
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/circles/${circleId}/members`);
}

export async function removeMemberFromCircleAdmin(
    circleId: string,
    targetUid: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみメンバーを削除できます');

    if (targetUid === currentUserUid) throw new Error('自分自身は削除できません');

    const memberRef = adminDb.collection('circles').doc(circleId).collection('members').doc(targetUid);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) throw new Error('このユーザーはメンバーではありません');

    if (memberDoc.data()?.role === 'organizer') {
        const membersRef = adminDb.collection('circles').doc(circleId).collection('members');
        const organizersSnapshot = await membersRef.where('role', '==', 'organizer').get();
        if (organizersSnapshot.size <= 1) throw new Error('最後のオーガナイザーは削除できません');
    }

    await memberRef.delete();

    revalidatePath(`/circles/${circleId}/members`);
}

export async function getCircleAdmin(circleId: string) {
    const snap = await adminDb.collection('circles').doc(circleId).get();
    if (!snap.exists) return null;
    return serializeDoc({
        id: snap.id,
        ...snap.data(),
    });
}

export async function getCircleMembersAdmin(circleId: string) {
    const snap = await adminDb.collection('circles').doc(circleId).collection('members').get();
    if (snap.empty) return [];

    return snap.docs.map(doc => serializeDoc({
        id: doc.id,
        ...doc.data(),
    }));
}


// =====================
// Circle Management
// =====================

export async function createCircleAdmin(
    input: { name: string; emoji: string; description: string },
    currentUser: { uid: string; displayName: string; email: string; photoURL: string | null }
) {
    const circleRef = adminDb.collection('circles').doc();
    const now = FieldValue.serverTimestamp();

    await circleRef.set({
        name: input.name,
        emoji: input.emoji || '',
        description: input.description,
        createdBy: currentUser.uid,
        createdAt: now,
        updatedAt: now,
    });

    // Creator becomes organizer
    await circleRef.collection('members').doc(currentUser.uid).set({
        uid: currentUser.uid,
        role: 'organizer',
        joinedAt: now,
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
    });

    revalidatePath('/dashboard');
    return circleRef.id;
}

export async function getCirclesForUserAdmin(uid: string) {
    // 1. Get all circles where user is a member
    const membersSnap = await adminDb.collectionGroup('members').where('uid', '==', uid).get();

    if (membersSnap.empty) return [];

    const circleIds = membersSnap.docs.map(doc => doc.ref.parent.parent!.id);

    // 2. Fetch circle details
    // Firestore 'in' query supports up to 30 items. 
    // If user has more than 30 circles, we need to batch or loop. 
    // For MVP, we'll loop or use Promise.all which is fine for Admin SDK (backend).
    const circles = [];

    for (const circleId of circleIds) {
        const circleSnap = await adminDb.collection('circles').doc(circleId).get();
        if (circleSnap.exists) {
            const data = circleSnap.data();
            circles.push({
                id: circleSnap.id,
                name: data?.name,
                emoji: data?.emoji,
                description: data?.description,
                createdBy: data?.createdBy,
                createdAt: data?.createdAt?.toDate().toISOString() ?? null,
                updatedAt: data?.updatedAt?.toDate().toISOString() ?? null,
                // We can add sorting field here if needed
                createdAtMillis: data?.createdAt?.toMillis() ?? 0
            });
        }
    }

    // Sort by createdAt desc
    return circles.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
}

export async function updateCircleAdmin(
    circleId: string,
    input: { name?: string; emoji?: string; description?: string },
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみ編集できます');

    await adminDb.collection('circles').doc(circleId).update({
        ...input,
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/circles/${circleId}`);
    revalidatePath('/dashboard');
}

// =====================
// Guest Management
// =====================

export async function addGuestAdmin(
    circleId: string,
    input: { name: string; email?: string; phoneNumber?: string; notes?: string },
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみゲストを追加できます');

    const guestRef = adminDb.collection('circles').doc(circleId).collection('guests').doc();

    await guestRef.set({
        circleId,
        name: input.name,
        email: input.email ?? null,
        phoneNumber: input.phoneNumber ?? null,
        notes: input.notes ?? null,
        addedBy: currentUserUid,
        addedAt: FieldValue.serverTimestamp(),
        isActive: true,
    });

    revalidatePath(`/circles/${circleId}/guests`);
    return guestRef.id;
}

export async function getActiveGuestsAdmin(circleId: string) {
    const snap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('guests')
        .where('isActive', '==', true)
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            circleId: data.circleId,
            name: data.name,
            email: data.email ?? null,
            phoneNumber: data.phoneNumber ?? null,
            notes: data.notes ?? null,
            addedBy: data.addedBy,
            addedAt: data.addedAt?.toDate().toISOString() ?? null,
            isActive: data.isActive,
        };
    });
}

export async function deactivateGuestAdmin(
    circleId: string,
    guestId: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみゲストを削除できます');

    await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('guests')
        .doc(guestId)
        .update({
            isActive: false,
        });

    revalidatePath(`/circles/${circleId}/guests`);
}

// =====================
// Attendance & Event
// =====================

export async function getEventAdmin(circleId: string, eventId: string) {
    const snap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .get();

    if (!snap.exists) return null;
    const data = snap.data();
    return {
        id: snap.id,
        circleId: data?.circleId,
        name: data?.name,
        eventType: data?.eventType,
        description: data?.description ?? '',
        dateTime: data?.dateTime?.toDate().toISOString() ?? null, // Legacy field if exists
        startTime: data?.startTime?.toDate().toISOString() ?? null,
        endTime: data?.endTime?.toDate().toISOString() ?? null,
        location: data?.location ?? null,
        fee: data?.fee ?? 0,
        isArchived: data?.isArchived ?? false,
        createdBy: data?.createdBy,
        createdAt: data?.createdAt?.toDate().toISOString() ?? null,
        updatedAt: data?.updatedAt?.toDate().toISOString() ?? null,
    };
}

export async function getAttendanceForEventAdmin(
    circleId: string,
    eventId: string
) {
    const snap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('attendance')
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            eventId: data.eventId,
            circleId: data.circleId,
            isGuest: data.isGuest,
            uid: data.uid ?? null,
            guestId: data.guestId ?? null,
            attended: data.attended,
            checkedInAt: data.checkedInAt?.toDate().toISOString() ?? null,
            checkedInBy: data.checkedInBy,
            displayName: data.displayName,
            email: data.email ?? null,
            photoURL: data.photoURL ?? null,
        };
    });
}

export async function recordAttendanceAdmin(
    circleId: string,
    eventId: string,
    attendees: {
        id: string; // uid for members, guestId for guests
        isGuest: boolean;
        attended: boolean;
        displayName: string;
        email?: string;
        photoURL?: string | null;
        uid?: string;
        guestId?: string;
    }[],
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみ出欠を記録できます');

    // Get event to retrieve fee
    const eventSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .get();

    if (!eventSnap.exists) throw new Error('イベントが見つかりません');
    const eventData = eventSnap.data();
    const fee = (eventData?.fee as number) || 0;

    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();

    for (const attendee of attendees) {
        // Write attendance record
        const attendanceRef = adminDb
            .collection('circles')
            .doc(circleId)
            .collection('events')
            .doc(eventId)
            .collection('attendance')
            .doc(attendee.id);

        const attendanceData: any = {
            eventId,
            circleId,
            isGuest: attendee.isGuest,
            attended: attendee.attended,
            checkedInAt: attendee.attended ? now : null,
            checkedInBy: currentUserUid,
            displayName: attendee.displayName,
        };

        // Only set uid or guestId, not both (avoid undefined)
        if (attendee.isGuest && attendee.guestId) {
            attendanceData.guestId = attendee.guestId;
        } else if (!attendee.isGuest && attendee.uid) {
            attendanceData.uid = attendee.uid;
        }

        // Only set optional fields if they exist
        if (attendee.email) attendanceData.email = attendee.email;
        if (attendee.photoURL !== undefined) attendanceData.photoURL = attendee.photoURL;

        batch.set(attendanceRef, attendanceData);

        // If attended, create/update payment record with 'unpaid' status
        if (attendee.attended) {
            const paymentRef = adminDb
                .collection('circles')
                .doc(circleId)
                .collection('events')
                .doc(eventId)
                .collection('payments')
                .doc(attendee.id);

            const paymentData: any = {
                eventId,
                circleId,
                isGuest: attendee.isGuest,
                amount: fee,
                baseFee: fee,
                items: [],
                status: 'unpaid',
                markedPaidAt: null,
                confirmedAt: null,
                createdAt: now,
                updatedAt: now,
                displayName: attendee.displayName,
            };

            if (attendee.isGuest && attendee.guestId) {
                paymentData.guestId = attendee.guestId;
            } else if (!attendee.isGuest && attendee.uid) {
                paymentData.uid = attendee.uid;
            }

            if (attendee.email) paymentData.email = attendee.email;

            batch.set(paymentRef, paymentData);
        }
    }

    await batch.commit();

    // ゲーミフィケーション: 出席した非ゲストメンバーにポイント付与
    for (const attendee of attendees) {
        if (!attendee.isGuest && attendee.attended && attendee.uid) {
            try {
                const result = await awardPointsWithResult(attendee.uid, 'attendance', 10);
                await updateCircleLeaderboard(circleId, attendee.uid, result.pointsAwarded[0]?.points ?? 10);
                await recalculateStreak(attendee.uid);
            } catch (e) { /* ポイント付与失敗は無視 */ }
        }
    }
    // 一括記録は幹事操作のため、個別メンバーのGamificationResultはクライアントに返さない
}

export async function qrCheckInAdmin(
    circleId: string,
    eventId: string,
    memberUid: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみチェックインを実行できます');

    // メンバーであることを確認
    const memberSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('members')
        .doc(memberUid)
        .get();

    if (!memberSnap.exists) throw new Error('このサークルのメンバーではありません');
    const memberData = memberSnap.data();

    // イベント情報を取得（参加費）
    const eventSnap = await adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .get();

    if (!eventSnap.exists) throw new Error('イベントが見つかりません');
    const eventData = eventSnap.data();
    const fee = eventData?.fee as number;

    // 既にチェックイン済みか確認
    const attendanceRef = adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('attendance')
        .doc(memberUid);

    const existingSnap = await attendanceRef.get();

    if (existingSnap.exists && existingSnap.data()?.attended) {
        return { success: false, displayName: memberData?.displayName };
    }

    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();

    // 出欠記録
    batch.set(attendanceRef, {
        eventId,
        circleId,
        isGuest: false,
        uid: memberUid,
        attended: true,
        checkedInAt: now,
        checkedInBy: currentUserUid,
        displayName: memberData?.displayName,
        email: memberData?.email || '',
        photoURL: memberData?.photoURL || null,
    });

    // 支払い記録を自動生成
    const paymentRef = adminDb
        .collection('circles')
        .doc(circleId)
        .collection('events')
        .doc(eventId)
        .collection('payments')
        .doc(memberUid);

    batch.set(paymentRef, {
        eventId,
        circleId,
        isGuest: false,
        uid: memberUid,
        amount: fee,
        baseFee: fee,
        items: [],
        status: 'unpaid',
        markedPaidAt: null,
        confirmedAt: null,
        createdAt: now,
        updatedAt: now,
        displayName: memberData?.displayName,
        email: memberData?.email || '',
    });

    await batch.commit();

    // ゲーミフィケーション: QRチェックインでポイント付与
    let gamification: GamificationResult = { ...EMPTY_GAMIFICATION_RESULT };
    try {
        gamification = await awardPointsWithResult(memberUid, 'attendance', 10);
        await updateCircleLeaderboard(circleId, memberUid, gamification.pointsAwarded[0]?.points ?? 10);
        const streakResult = await recalculateStreak(memberUid);
        if (streakResult.streakGamification) {
            gamification = mergeGamificationResults(gamification, streakResult.streakGamification);
        } else if (streakResult.currentStreak >= 2) {
            gamification.streakUpdate = { current: streakResult.currentStreak, isMilestone: false };
        }
    } catch (e) { /* ポイント付与失敗は無視 */ }

    return { success: true, displayName: memberData?.displayName, gamification };
}

// =====================
// Payment Management
// =====================

export async function getPaymentsForEventAdmin(circleId: string, eventId: string) {
    const snap = await adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments')
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            eventId: data.eventId,
            circleId: data.circleId,
            uid: data.uid ?? null,
            guestId: data.guestId ?? null,
            isGuest: data.isGuest,
            amount: data.amount,
            baseFee: data.baseFee ?? data.amount ?? 0,
            items: data.items ?? [],
            status: data.status,
            displayName: data.displayName,
            email: data.email ?? null,
            markedPaidAt: data.markedPaidAt?.toDate().toISOString() ?? null,
            markedPaidBy: data.markedPaidBy ?? null,
            confirmedAt: data.confirmedAt?.toDate().toISOString() ?? null,
            confirmedBy: data.confirmedBy ?? null,
            createdAt: data.createdAt?.toDate().toISOString() ?? null,
            updatedAt: data.updatedAt?.toDate().toISOString() ?? null,
        };
    });
}

/** メンバーが自分の支払いを「支払い済み」としてマーク */
export async function markAsPaidAdmin(
    circleId: string,
    eventId: string,
    currentUserUid: string
) {
    const paymentRef = adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments').doc(currentUserUid);

    const snap = await paymentRef.get();
    if (!snap.exists) throw new Error('支払い記録が見つかりません');

    const data = snap.data();
    if (data?.status === 'confirmed') throw new Error('すでに確認済みです');

    await paymentRef.update({
        status: 'pending_confirmation',
        markedPaidAt: FieldValue.serverTimestamp(),
        markedPaidBy: currentUserUid,
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/circles/${circleId}/events/${eventId}/payments`);
}

/** 幹事が支払いを確認 */
export async function confirmPaymentAdmin(
    circleId: string,
    eventId: string,
    paymentId: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみ確認できます');

    const paymentRef = adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments').doc(paymentId);

    const paymentDoc = await paymentRef.get();
    const payerUid = paymentDoc.data()?.uid;

    await paymentRef.update({
        status: 'confirmed',
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedBy: currentUserUid,
        updatedAt: FieldValue.serverTimestamp(),
    });

    // ゲーミフィケーション: 支払い確認でポイント付与
    let gamification: GamificationResult = { ...EMPTY_GAMIFICATION_RESULT };
    if (payerUid && !paymentDoc.data()?.isGuest) {
        try {
            gamification = await awardPointsWithResult(payerUid, 'payment', 5);
            await updateCircleLeaderboard(circleId, payerUid, gamification.pointsAwarded[0]?.points ?? 5);
        } catch (e) { /* ポイント付与失敗は無視 */ }
    }

    revalidatePath(`/circles/${circleId}/events/${eventId}/payments`);
    return { gamification };
}

/** 幹事が支払いを未払いにリセット */
export async function resetPaymentAdmin(
    circleId: string,
    eventId: string,
    paymentId: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみリセットできます');

    const paymentRef = adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments').doc(paymentId);

    await paymentRef.update({
        status: 'unpaid',
        markedPaidAt: null,
        markedPaidBy: null,
        confirmedAt: null,
        confirmedBy: null,
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/circles/${circleId}/events/${eventId}/payments`);
}

// =====================
// Event Management
// =====================

export async function createEventAdmin(
    circleId: string,
    input: {
        name: string;
        description: string;
        date: string; // ISO string
        location: string;
        fee: number;
    },
    currentUserUid: string
): Promise<string> {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみイベントを作成できます');

    const eventRef = adminDb.collection('circles').doc(circleId).collection('events').doc();
    const now = FieldValue.serverTimestamp();

    await eventRef.set({
        circleId,
        name: input.name,
        description: input.description,
        date: new Date(input.date),
        location: input.location,
        fee: input.fee,
        createdBy: currentUserUid,
        createdAt: now,
        updatedAt: now,
    });

    // recentFees を更新（直近3件のユニークな料金）
    if (input.fee > 0) {
        try {
            const circleDoc = await adminDb.collection('circles').doc(circleId).get();
            const existing: number[] = circleDoc.data()?.recentFees ?? [];
            const updated = [input.fee, ...existing.filter((f: number) => f !== input.fee)].slice(0, 3);
            await adminDb.collection('circles').doc(circleId).update({ recentFees: updated });
        } catch { /* non-critical */ }
    }

    // 全メンバーにプッシュ通知を送る（非同期・失敗しても続行）
    try {
        const { notifyEventCreated } = await import('./notification.actions');
        await notifyEventCreated(circleId, eventRef.id, input.name, currentUserUid);
    } catch (err) {
        console.error('通知送信に失敗しました（イベントは正常に作成されました）:', err);
    }

    revalidatePath(`/circles/${circleId}`);
    return eventRef.id;
}

// =====================
// Event Edit / Delete
// =====================

export async function updateEventAdmin(
    circleId: string,
    eventId: string,
    input: {
        name?: string;
        description?: string;
        date?: string;
        location?: string;
        fee?: number;
    },
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみイベントを編集できます');

    const eventRef = adminDb.collection('circles').doc(circleId).collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) throw new Error('イベントが見つかりません');

    const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.date !== undefined) updateData['date'] = new Date(input.date);
    if (input.location !== undefined) updateData['location'] = input.location;
    if (input.fee !== undefined) updateData['fee'] = input.fee;

    await eventRef.update(updateData);

    revalidatePath(`/circles/${circleId}/events/${eventId}`);
    revalidatePath(`/circles/${circleId}`);
}

export async function deleteEventAdmin(
    circleId: string,
    eventId: string,
    currentUserUid: string
) {
    const isOrg = await isOrganizer(circleId, currentUserUid);
    if (!isOrg) throw new Error('オーガナイザーのみイベントを削除できます');

    const eventRef = adminDb.collection('circles').doc(circleId).collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) throw new Error('イベントが見つかりません');

    // Delete attendance subcollection
    const attendanceDocs = await eventRef.collection('attendance').get();
    const batch1 = adminDb.batch();
    attendanceDocs.docs.forEach(doc => batch1.delete(doc.ref));
    if (!attendanceDocs.empty) await batch1.commit();

    // Delete payments subcollection
    const paymentDocs = await eventRef.collection('payments').get();
    const batch2 = adminDb.batch();
    paymentDocs.docs.forEach(doc => batch2.delete(doc.ref));
    if (!paymentDocs.empty) await batch2.commit();

    // Delete event document
    await eventRef.delete();

    revalidatePath(`/circles/${circleId}`);
}

// =====================
// Member Self-Attendance Response
// =====================

export async function respondAttendanceAdmin(
    circleId: string,
    eventId: string,
    uid: string,
    response: 'attend' | 'absent',
    displayName: string,
    email?: string,
    photoURL?: string | null
) {
    // Verify user is a member
    const memberDoc = await adminDb.collection('circles').doc(circleId).collection('members').doc(uid).get();
    if (!memberDoc.exists) throw new Error('サークルのメンバーではありません');

    // Verify event exists
    const eventRef = adminDb.collection('circles').doc(circleId).collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) throw new Error('イベントが見つかりません');

    const attendanceRef = eventRef.collection('attendance').doc(uid);
    const now = FieldValue.serverTimestamp();

    if (response === 'attend') {
        await attendanceRef.set({
            eventId,
            circleId,
            isGuest: false,
            uid,
            attended: true,
            checkedInAt: null,
            checkedInBy: '',
            displayName,
            email: email || '',
            photoURL: photoURL || null,
        }, { merge: true });

        // Auto-generate payment record if fee > 0
        const fee = eventDoc.data()?.fee ?? 0;
        if (fee > 0) {
            const paymentRef = eventRef.collection('payments').doc(uid);
            const paymentDoc = await paymentRef.get();
            if (!paymentDoc.exists) {
                await paymentRef.set({
                    eventId,
                    circleId,
                    isGuest: false,
                    uid,
                    amount: fee,
                    baseFee: fee,
                    items: [],
                    status: 'unpaid',
                    markedPaidAt: null,
                    confirmedAt: null,
                    createdAt: now,
                    updatedAt: now,
                    displayName,
                    email: email || '',
                });
            }
        }
        // ゲーミフィケーション: 出欠回答（参加）でポイント付与 + 早期回答ボーナス
        let gamification: GamificationResult = { ...EMPTY_GAMIFICATION_RESULT };
        try {
            const attendResult = await awardPointsWithResult(uid, 'attendance', 10);
            gamification = attendResult;
            await updateCircleLeaderboard(circleId, uid, attendResult.pointsAwarded[0]?.points ?? 10);

            // 早期回答ボーナス: イベント3日前までに回答したら+5pt
            const eventData = eventDoc.data();
            const eventDate = eventData?.date?.toMillis?.();
            if (eventDate) {
                const threeDaysBefore = eventDate - 3 * 24 * 60 * 60 * 1000;
                if (Date.now() <= threeDaysBefore) {
                    const earlyResult = await awardPointsWithResult(uid, 'earlyResponse', 5);
                    gamification = mergeGamificationResults(gamification, earlyResult);
                    await updateCircleLeaderboard(circleId, uid, earlyResult.pointsAwarded[0]?.points ?? 5);
                }
            }
            const streakResult = await recalculateStreak(uid);
            if (streakResult.streakGamification) {
                gamification = mergeGamificationResults(gamification, streakResult.streakGamification);
            } else if (streakResult.currentStreak >= 2) {
                gamification.streakUpdate = { current: streakResult.currentStreak, isMilestone: false };
            }
        } catch (e) { /* ポイント付与失敗は無視 */ }

        revalidatePath(`/circles/${circleId}/events/${eventId}`);
        return { gamification };
    } else {
        // Mark as not attending
        await attendanceRef.set({
            eventId,
            circleId,
            isGuest: false,
            uid,
            attended: false,
            checkedInAt: null,
            checkedInBy: '',
            displayName,
            email: email || '',
            photoURL: photoURL || null,
        }, { merge: true });
    }

    revalidatePath(`/circles/${circleId}/events/${eventId}`);
    return { gamification: null };
}

export async function getMyAttendanceAdmin(
    circleId: string,
    eventId: string,
    uid: string
) {
    const doc = await adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('attendance').doc(uid)
        .get();

    if (!doc.exists) return null;
    return serializeDoc({ id: doc.id, ...doc.data() });
}

// =====================
// Circle Leave
// =====================

export async function leaveCircleAdmin(circleId: string, uid: string) {
    const memberRef = adminDb.collection('circles').doc(circleId).collection('members').doc(uid);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) throw new Error('サークルのメンバーではありません');

    // If organizer, check that at least one other organizer remains
    if (memberDoc.data()?.role === 'organizer') {
        const membersRef = adminDb.collection('circles').doc(circleId).collection('members');
        const organizersSnapshot = await membersRef.where('role', '==', 'organizer').get();
        if (organizersSnapshot.size <= 1) {
            throw new Error('最後のオーガナイザーは脱退できません。他のメンバーをオーガナイザーに昇格してから脱退してください。');
        }
    }

    await memberRef.delete();

    revalidatePath(`/circles/${circleId}`);
    revalidatePath('/dashboard');
}

// =====================
// Payment Line Items (明細管理)
// =====================

/** メンバーの支払いにドリンク等の明細を追加 */
export async function addPaymentItemAdmin(
    circleId: string,
    eventId: string,
    paymentId: string,
    item: { name: string; price: number },
    currentUserUid: string
) {
    const name = item.name.trim();
    if (!name || name.length > 50) throw new Error('ドリンク名は1〜50文字で入力してください');
    if (!Number.isInteger(item.price) || item.price <= 0) throw new Error('金額は1円以上の整数で入力してください');

    // 権限チェック: 本人 or 幹事
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (!role) throw new Error('サークルメンバーではありません');
    const isSelf = paymentId === currentUserUid;
    if (!isSelf && role !== 'organizer') throw new Error('他のメンバーの明細は幹事のみ追加できます');

    const paymentRef = adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments').doc(paymentId);

    await adminDb.runTransaction(async (tx) => {
        const doc = await tx.get(paymentRef);
        if (!doc.exists) throw new Error('支払い記録が見つかりません');

        const data = doc.data()!;
        const items = data.items ?? [];
        if (items.length >= 20) throw new Error('明細は20件までです');

        const baseFee = data.baseFee ?? data.amount ?? 0;
        const newItem = {
            id: crypto.randomUUID(),
            name,
            price: item.price,
            addedBy: currentUserUid,
            addedAt: new Date().toISOString(),
        };
        const updatedItems = [...items, newItem];
        const newAmount = baseFee + updatedItems.reduce((s: number, i: any) => s + i.price, 0);

        tx.update(paymentRef, {
            items: updatedItems,
            baseFee,
            amount: newAmount,
            updatedAt: FieldValue.serverTimestamp(),
        });
    });

    revalidatePath(`/circles/${circleId}/events/${eventId}/payments`);
}

/** メンバーの支払いから明細を削除 */
export async function removePaymentItemAdmin(
    circleId: string,
    eventId: string,
    paymentId: string,
    itemId: string,
    currentUserUid: string
) {
    const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
    if (!role) throw new Error('サークルメンバーではありません');

    const paymentRef = adminDb
        .collection('circles').doc(circleId)
        .collection('events').doc(eventId)
        .collection('payments').doc(paymentId);

    await adminDb.runTransaction(async (tx) => {
        const doc = await tx.get(paymentRef);
        if (!doc.exists) throw new Error('支払い記録が見つかりません');

        const data = doc.data()!;
        const items = data.items ?? [];
        const targetItem = items.find((i: any) => i.id === itemId);
        if (!targetItem) throw new Error('明細が見つかりません');

        // 権限: 自分が追加した項目 or 幹事
        if (targetItem.addedBy !== currentUserUid && role !== 'organizer') {
            throw new Error('この明細を削除する権限がありません');
        }

        const baseFee = data.baseFee ?? data.amount ?? 0;
        const updatedItems = items.filter((i: any) => i.id !== itemId);
        const newAmount = baseFee + updatedItems.reduce((s: number, i: any) => s + i.price, 0);

        tx.update(paymentRef, {
            items: updatedItems,
            amount: newAmount,
            updatedAt: FieldValue.serverTimestamp(),
        });
    });

    revalidatePath(`/circles/${circleId}/events/${eventId}/payments`);
}
