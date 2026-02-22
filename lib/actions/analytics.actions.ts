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

    const eventIds: string[] = [];

    // We need to fetch attendance for each event to calculate stats
    // This might be expensive if there are many events. 
    // For MVP/Small circles, fetching subcollections for each event is okay.
    // Optimization: Collection Group query for attendance where circleId == circleId

    // Let's use collectionGroup for attendance to get total attendance count efficiently
    // But we need to filter by circleId. 
    // The `attendance` subcollection usually doesn't have `circleId` in it automatically unless we added it?
    // Looking at `recordAttendanceAdmin` in `admin.actions.ts`, we DO save `circleId` in attendance docs!
    // So we can use a collectionGroup query.

    const attendanceQuerySnap = await adminDb.collectionGroup('attendance')
        .where('circleId', '==', circleId)
        .where('attended', '==', true)
        .get();

    totalattendance = attendanceQuerySnap.size;

    // Calculate monthly stats
    const monthlyMap = new Map<string, number>();
    attendanceQuerySnap.forEach(doc => {
        const data = doc.data();
        if (data.checkedInAt) {
            const date = data.checkedInAt.toDate();
            // Format: 2024-02
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
    });

    // Convert to array and sort (last 6 months)
    const monthlyStats = Array.from(monthlyMap.entries())
        .map(([key, value]) => ({ name: key, attendance: value }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-6); // Last 6 months

    // Calculate upcoming events locally
    eventsSnap.forEach(doc => {
        const data = doc.data();
        const eventDate = data.startTime?.toDate(); // existing field
        if (eventDate && eventDate > now) {
            upcomingEvents++;
        }
    });

    const averageAttendance = totalEvents > 0 ? (totalattendance / totalEvents) : 0;

    return serializeDoc({
        totalEvents,
        upcomingEvents,
        totalattendance,
        averageAttendance: parseFloat(averageAttendance.toFixed(1)), // Round to 1 decimal
        memberCount,
        monthlyStats,
    });
}

export async function getUnpaidMembersAdmin(circleId: string, currentUserUid: string): Promise<UnpaidMember[]> {
    // Auth check
    const isOrg = await isOrganizerInternal(circleId, currentUserUid);
    if (!isOrg) throw new Error('Unauthorized: Only organizers can view unpaid members.');

    // 1. Get all payments with status 'unpaid' for this circle
    // usage of collectionGroup is good practice here too if we have circleId
    // Looking at `recordAttendanceAdmin`, we DO save `circleId` in payment docs!

    const unpaidPaymentsSnap = await adminDb.collectionGroup('payments')
        .where('circleId', '==', circleId)
        .where('status', '==', 'unpaid')
        .get();

    if (unpaidPaymentsSnap.empty) return [];

    // 2. Aggregate by user
    const unpaidMap = new Map<string, UnpaidMember>();

    // We need event names. 
    // Optimization: Fetch all events for this circle once to create a map of eventId -> eventName
    const eventsSnap = await adminDb.collection('circles').doc(circleId).collection('events').get();
    const eventNameMap = new Map<string, { name: string, date: string }>();
    eventsSnap.forEach(doc => {
        const d = doc.data();
        eventNameMap.set(doc.id, {
            name: d.name || 'Unknown Event',
            date: d.startTime?.toDate().toISOString() || new Date().toISOString()
        });
    });

    for (const doc of unpaidPaymentsSnap.docs) {
        const data = doc.data();
        const uid = data.uid || data.guestId; // Handle guests too? existing logic in admin uses uid or guestId
        if (!uid) continue;

        // existing logic stores displayName, email, photoURL in payment doc too, which is handy

        if (!unpaidMap.has(uid)) {
            unpaidMap.set(uid, {
                uid,
                displayName: data.displayName || 'Unknown',
                email: data.email || null,
                photoURL: data.photoURL || null,
                totalUnpaid: 0,
                unpaidEvents: []
            });
        }

        const member = unpaidMap.get(uid)!;
        const amount = Number(data.amount) || 0;
        const eventInfo = eventNameMap.get(data.eventId);

        member.totalUnpaid += amount;
        member.unpaidEvents.push({
            eventId: data.eventId,
            eventName: eventInfo?.name || 'Unknown Event',
            amount: amount,
            date: eventInfo?.date || '',
        });
    }

    // Convert map to array and sort by total unpaid desc
    return serializeDoc(Array.from(unpaidMap.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid));
}
