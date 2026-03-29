'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { getCurrentUserRoleAdmin } from './admin.actions';
import { serializeDoc } from '@/lib/utils/serialize';
// Re-implementing helper to check if user is organizer in a circle
// Re-implementing helper to check if user is organizer in a circle
async function isOrganizerInternal(circleId: string, uid: string): Promise<boolean> {
    const role = await getCurrentUserRoleAdmin(circleId, uid);
    return role === 'organizer';
}

export interface CircleStats {
    totalEvents: number;
    upcomingEvents: number;
    totalattendance: number; // Sum of all attendance records
    averageAttendance: number;
    memberCount: number;
    monthlyStats: { name: string; attendance: number }[];
    totalPayments: number;
    confirmedPayments: number;
}

export interface UnpaidMember {
    uid: string;
    displayName: string;
    email: string | null;
    photoURL: string | null;
    totalUnpaid: number;
    unpaidEvents: {
        eventId: string;
        eventName: string;
        amount: number;
        date: string; // ISO string
    }[];
}

export async function getCircleStatsAdmin(circleId: string, currentUserUid: string): Promise<CircleStats> {
    // Auth check
    const isOrg = await isOrganizerInternal(circleId, currentUserUid);
    if (!isOrg) throw new Error('Unauthorized: Only organizers can view analytics.');

    // 1. Get Member Count
    const membersSnap = await adminDb.collection('circles').doc(circleId).collection('members').get();
    const memberCount = membersSnap.size;

    // 2. Get All Events
    const eventsSnap = await adminDb.collection('circles').doc(circleId).collection('events').get();
    const totalEvents = eventsSnap.size;

    let upcomingEvents = 0;
    let totalattendance = 0;
    const now = new Date();

    // イベントごとにサブコレクションを直接クエリ（collectionGroupインデックス不要）
    const monthlyMap = new Map<string, number>();
    let totalPayments = 0;
    let confirmedPayments = 0;

    for (const eventDoc of eventsSnap.docs) {
        const eventData = eventDoc.data();
        const eventDate = eventData.date?.toDate?.() ?? eventData.startTime?.toDate?.();

        if (eventDate && eventDate > now) {
            upcomingEvents++;
        }

        // 出席データ
        const attSnap = await adminDb
            .collection('circles').doc(circleId)
            .collection('events').doc(eventDoc.id)
            .collection('attendance')
            .where('attended', '==', true)
            .get();

        totalattendance += attSnap.size;

        attSnap.forEach(doc => {
            const data = doc.data();
            const checkDate = data.checkedInAt?.toDate?.() ?? eventDate;
            if (checkDate) {
                const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
            }
        });

        // 支払いデータ
        const paySnap = await adminDb
            .collection('circles').doc(circleId)
            .collection('events').doc(eventDoc.id)
            .collection('payments')
            .get();

        totalPayments += paySnap.size;
        confirmedPayments += paySnap.docs.filter(d => d.data().status === 'confirmed').length;
    }

    // 月別統計（直近6ヶ月）
    const monthlyStats = Array.from(monthlyMap.entries())
        .map(([key, value]) => ({ name: key, attendance: value }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-6);

    const averageAttendance = totalEvents > 0 ? (totalattendance / totalEvents) : 0;

    return serializeDoc({
        totalEvents,
        upcomingEvents,
        totalattendance,
        averageAttendance: parseFloat(averageAttendance.toFixed(1)), // Round to 1 decimal
        memberCount,
        monthlyStats,
        totalPayments,
        confirmedPayments,
    });
}

export async function getUnpaidMembersAdmin(circleId: string, currentUserUid: string): Promise<UnpaidMember[]> {
    // Auth check
    const isOrg = await isOrganizerInternal(circleId, currentUserUid);
    if (!isOrg) throw new Error('Unauthorized: Only organizers can view unpaid members.');

    // イベントごとにpaymentsサブコレクションを直接クエリ
    const eventsSnap = await adminDb.collection('circles').doc(circleId).collection('events').get();
    const unpaidMap = new Map<string, UnpaidMember>();

    for (const eventDoc of eventsSnap.docs) {
        const eventData = eventDoc.data();
        const eventName = eventData.name || 'Unknown Event';
        const eventDate = eventData.date?.toDate?.()?.toISOString() ?? eventData.startTime?.toDate?.()?.toISOString() ?? '';

        const paySnap = await adminDb
            .collection('circles').doc(circleId)
            .collection('events').doc(eventDoc.id)
            .collection('payments')
            .where('status', '==', 'unpaid')
            .get();

        for (const doc of paySnap.docs) {
            const data = doc.data();
            const uid = data.uid || data.guestId;
            if (!uid) continue;

            if (!unpaidMap.has(uid)) {
                unpaidMap.set(uid, {
                    uid,
                    displayName: data.displayName || 'Unknown',
                    email: data.email || null,
                    photoURL: data.photoURL || null,
                    totalUnpaid: 0,
                    unpaidEvents: [],
                });
            }

            const member = unpaidMap.get(uid)!;
            const amount = Number(data.amount) || 0;
            member.totalUnpaid += amount;
            member.unpaidEvents.push({
                eventId: eventDoc.id,
                eventName,
                amount,
                date: eventDate,
            });
        }
    }

    return serializeDoc(Array.from(unpaidMap.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid));
}

/**
 * サークル内メンバーの出席ランキングを取得
 */
export interface MemberRanking {
    uid: string;
    displayName: string;
    photoURL: string | null;
    attendanceCount: number;
    rank: number;
}

export async function getMemberRankingAdmin(circleId: string, currentUserUid: string): Promise<MemberRanking[]> {
    const isOrg = await isOrganizerInternal(circleId, currentUserUid);
    if (!isOrg) throw new Error('Unauthorized');

    // イベントごとに出席データを集計（collectionGroup不要）
    const eventsSnap = await adminDb.collection('circles').doc(circleId).collection('events').get();
    const countMap = new Map<string, number>();

    for (const eventDoc of eventsSnap.docs) {
        const attSnap = await adminDb
            .collection('circles').doc(circleId)
            .collection('events').doc(eventDoc.id)
            .collection('attendance')
            .where('attended', '==', true)
            .get();

        attSnap.forEach(doc => {
            const uid = doc.data().uid;
            if (uid) countMap.set(uid, (countMap.get(uid) || 0) + 1);
        });
    }

    // メンバー情報取得
    const membersSnap = await adminDb.collection('circles').doc(circleId).collection('members').get();
    const memberMap = new Map<string, { displayName: string; photoURL: string | null }>();
    for (const doc of membersSnap.docs) {
        const data = doc.data();
        memberMap.set(data.uid, {
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null,
        });
    }

    // ランキング作成
    const rankings: MemberRanking[] = Array.from(memberMap.entries()).map(([uid, info]) => ({
        uid,
        displayName: info.displayName,
        photoURL: info.photoURL,
        attendanceCount: countMap.get(uid) || 0,
        rank: 0,
    }));

    // ソート＆ランク付与
    rankings.sort((a, b) => b.attendanceCount - a.attendanceCount);
    rankings.forEach((r, i) => { r.rank = i + 1; });

    return serializeDoc(rankings.slice(0, 10)); // Top 10
}
