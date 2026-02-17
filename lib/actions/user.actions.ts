'use client';

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    collectionGroup,
    arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { UserProfile, AttendanceRecord, PaymentRecord } from '@/lib/types/models';

/**
 * ユーザープロフィールを取得
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    return userDoc.data() as UserProfile;
}

/**
 * ユーザープロフィールを更新
 */
export async function updateUserProfile(
    uid: string,
    data: { faculty?: string; grade?: string }
): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data);
}

/**
 * FCMトークンをユーザーのFirestoreドキュメントに保存
 */
export async function saveFCMToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        fcmTokens: arrayUnion(token),
    });
}

/**
 * ユーザーの全出席履歴を取得
 * Firestoreのcollection groupを使用して、全サークル・全イベントからユーザーの出席記録を取得
 */
export async function getUserAttendanceHistory(uid: string): Promise<AttendanceRecord[]> {
    const attendanceQuery = query(
        collectionGroup(db, 'attendance'),
        where('uid', '==', uid),
        where('attended', '==', true)
    );
    const snapshot = await getDocs(attendanceQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
}

/**
 * ユーザーの全支払い履歴を取得
 */
export async function getUserPaymentHistory(uid: string): Promise<PaymentRecord[]> {
    const paymentQuery = query(
        collectionGroup(db, 'payments'),
        where('uid', '==', uid)
    );
    const snapshot = await getDocs(paymentQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PaymentRecord));
}

/**
 * 出席回数からランクを計算
 */
export function calculateRank(attendanceCount: number): string {
    if (attendanceCount >= 51) return 'Legend';
    if (attendanceCount >= 31) return 'Master';
    if (attendanceCount >= 16) return 'Expert';
    if (attendanceCount >= 6) return 'Regular';
    return 'Beginner';
}

/**
 * 全イベント数を取得（ユーザーが所属するサークルのイベント）
 */
export async function getTotalEventsForUser(uid: string): Promise<number> {
    // ユーザーが所属するサークルを取得
    const circlesQuery = query(
        collectionGroup(db, 'members'),
        where('uid', '==', uid)
    );
    const circlesSnapshot = await getDocs(circlesQuery);

    let totalEvents = 0;
    for (const memberDoc of circlesSnapshot.docs) {
        const circleId = memberDoc.ref.parent.parent?.id;
        if (circleId) {
            const eventsSnapshot = await getDocs(collection(db, 'circles', circleId, 'events'));
            totalEvents += eventsSnapshot.size;
        }
    }

    return totalEvents;
}

/**
 * 連続出席日数を計算
 */
export function calculateStreak(attendanceRecords: AttendanceRecord[]): number {
    if (attendanceRecords.length === 0) return 0;

    // 日付順にソート
    const sorted = [...attendanceRecords].sort((a, b) => {
        if (!a.checkedInAt || !b.checkedInAt) return 0;
        return b.checkedInAt.toMillis() - a.checkedInAt.toMillis();
    });

    let streak = 0;
    let lastDate: Date | null = null;

    for (const record of sorted) {
        if (!record.checkedInAt) continue;

        const currentDate = record.checkedInAt.toDate();

        if (!lastDate) {
            streak = 1;
            lastDate = currentDate;
        } else {
            const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

            // 1日以内なら連続とみなす（同日または翌日）
            if (daysDiff <= 1) {
                streak++;
                lastDate = currentDate;
            } else {
                break;
            }
        }
    }

    return streak;
}

/**
 * 過去1年間のヒートマップデータを生成
 */
export async function getHeatmapData(uid: string): Promise<Record<string, boolean>> {
    const attendanceHistory = await getUserAttendanceHistory(uid);
    const heatmap: Record<string, boolean> = {};

    attendanceHistory.forEach((record) => {
        if (record.checkedInAt) {
            const date = record.checkedInAt.toDate();
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            heatmap[dateKey as string] = true;
        }
    });

    return heatmap;
}
