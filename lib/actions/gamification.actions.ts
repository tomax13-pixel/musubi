'use server';

import { adminDb } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserGamificationStats, UserBadge, GamificationResult } from '@/lib/types/gamification';
import { BADGE_DEFINITIONS, EMPTY_GAMIFICATION_RESULT, calculatePointRank } from '@/lib/types/gamification';

const DEFAULT_STATS: Omit<UserGamificationStats, 'updatedAt'> = {
    totalPoints: 0,
    pointBreakdown: {
        attendance: 0,
        payment: 0,
        poll: 0,
        earlyResponse: 0,
        streak: 0,
    },
    currentStreak: 0,
    bestStreak: 0,
    loginStreak: 0,
    lastLoginDate: '',
    bestLoginStreak: 0,
    lastPointsEarnedAt: '',
};

/**
 * ゲーミフィケーション統計を取得（存在しない場合はデフォルト値）
 */
export async function getUserGamificationStats(uid: string): Promise<UserGamificationStats> {
    const doc = await adminDb.collection('users').doc(uid).collection('gamification').doc('stats').get();
    if (!doc.exists) {
        return { ...DEFAULT_STATS, updatedAt: '' } as UserGamificationStats;
    }
    const data = doc.data()!;
    return {
        totalPoints: data.totalPoints ?? 0,
        pointBreakdown: {
            attendance: data.pointBreakdown?.attendance ?? 0,
            payment: data.pointBreakdown?.payment ?? 0,
            poll: data.pointBreakdown?.poll ?? 0,
            earlyResponse: data.pointBreakdown?.earlyResponse ?? 0,
            streak: data.pointBreakdown?.streak ?? 0,
        },
        currentStreak: data.currentStreak ?? 0,
        bestStreak: data.bestStreak ?? 0,
        loginStreak: data.loginStreak ?? 0,
        lastLoginDate: data.lastLoginDate ?? '',
        bestLoginStreak: data.bestLoginStreak ?? 0,
        lastPointsEarnedAt: data.lastPointsEarnedAt ?? '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
    } as UserGamificationStats;
}

/**
 * ポイントを付与する
 * type: 'attendance' | 'payment' | 'poll' | 'earlyResponse' | 'streak'
 */
export async function awardPoints(
    uid: string,
    type: 'attendance' | 'payment' | 'poll' | 'earlyResponse' | 'streak',
    points: number
) {
    const statsRef = adminDb.collection('users').doc(uid).collection('gamification').doc('stats');

    await statsRef.set({
        totalPoints: FieldValue.increment(points),
        [`pointBreakdown.${type}`]: FieldValue.increment(points),
        lastPointsEarnedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

/**
 * ランダムボーナス倍率を判定（変動比率スケジュール）
 * 10% → 2倍, 4% → 3倍, 1% → 5倍
 */
function rollBonusMultiplier(): number | null {
    const roll = Math.random();
    if (roll < 0.01) return 5;       // 1%: ウルトラレア
    if (roll < 0.05) return 3;       // 4%: スーパーラッキー
    if (roll < 0.15) return 2;       // 10%: ラッキー
    return null;
}

/**
 * ポイント付与 + 即時フィードバック結果を返す（ランダムボーナス込み）
 * 呼び出し側はこの結果をクライアントに返し、トーストを表示する
 */
export async function awardPointsWithResult(
    uid: string,
    type: 'attendance' | 'payment' | 'poll' | 'earlyResponse' | 'streak',
    basePoints: number
): Promise<GamificationResult> {
    // ランク計算用に現在のstatsを取得
    const statsBefore = await getUserGamificationStats(uid);
    const rankBefore = calculatePointRank(statsBefore.totalPoints).name;

    // ランダムボーナス判定
    const multiplier = rollBonusMultiplier();
    const actualPoints = multiplier ? basePoints * multiplier : basePoints;

    // ポイント付与
    await awardPoints(uid, type, actualPoints);

    // 付与後のstatsを取得してランクアップ判定
    const statsAfter = await getUserGamificationStats(uid);
    const rankAfter = calculatePointRank(statsAfter.totalPoints).name;

    // バッジチェック
    const newBadges = await checkAndGrantBadges(uid);

    return {
        pointsAwarded: [{ type, points: actualPoints }],
        totalPointsAfter: statsAfter.totalPoints,
        newBadges,
        rankUp: rankBefore !== rankAfter ? { from: rankBefore, to: rankAfter } : null,
        streakUpdate: null, // 呼び出し側でストリーク結果をマージ
        bonusMultiplier: multiplier,
    };
}



/**
 * イベント単位のストリークを再計算
 * 「直近のイベントから遡って、連続出席したイベント数」をカウント
 */
export async function recalculateStreak(uid: string): Promise<{ currentStreak: number; bestStreak: number; streakGamification: GamificationResult | null }> {
    // ユーザーが所属する全サークルのイベントを取得
    const membersSnap = await adminDb.collectionGroup('members').where('uid', '==', uid).get();
    const circleIds = membersSnap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean) as string[];

    if (circleIds.length === 0) return { currentStreak: 0, bestStreak: 0, streakGamification: null };

    // 全サークルの全イベントを日時順に取得
    interface EventInfo { circleId: string; eventId: string; date: number; attended: boolean }
    const allEvents: EventInfo[] = [];

    for (const circleId of circleIds) {
        const eventsSnap = await adminDb
            .collection('circles').doc(circleId)
            .collection('events')
            .orderBy('date', 'desc')
            .get();

        for (const eventDoc of eventsSnap.docs) {
            const eventData = eventDoc.data();
            const eventDate = eventData.date?.toMillis?.() ?? 0;

            // この人の出欠を確認
            const attendanceDoc = await adminDb
                .collection('circles').doc(circleId)
                .collection('events').doc(eventDoc.id)
                .collection('attendance').doc(uid)
                .get();

            const attended = attendanceDoc.exists && attendanceDoc.data()?.attended === true;

            allEvents.push({
                circleId,
                eventId: eventDoc.id,
                date: eventDate,
                attended,
            });
        }
    }

    // 日時降順ソート
    allEvents.sort((a, b) => b.date - a.date);

    // 未来のイベントを除外
    const now = Date.now();
    const pastEvents = allEvents.filter(e => e.date <= now);

    // 連続出席カウント
    let currentStreak = 0;
    for (const event of pastEvents) {
        if (event.attended) {
            currentStreak++;
        } else {
            break;
        }
    }

    // ストリーク更新をFirestoreに保存
    const statsRef = adminDb.collection('users').doc(uid).collection('gamification').doc('stats');
    const existingDoc = await statsRef.get();
    const existingBest = existingDoc.exists ? (existingDoc.data()?.bestStreak ?? 0) : 0;
    const bestStreak = Math.max(existingBest, currentStreak);

    await statsRef.set({
        currentStreak,
        bestStreak,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // ストリークボーナスポイント（変動報酬込み）
    let streakGamification: GamificationResult | null = null;
    const isMilestone = currentStreak > 0 && (currentStreak % 3 === 0 || currentStreak % 5 === 0);

    if (currentStreak > 0 && currentStreak % 5 === 0) {
        streakGamification = await awardPointsWithResult(uid, 'streak', 10);
    } else if (currentStreak > 0 && currentStreak % 3 === 0) {
        streakGamification = await awardPointsWithResult(uid, 'streak', 5);
    }

    if (streakGamification) {
        streakGamification.streakUpdate = { current: currentStreak, isMilestone: true };
    }

    return { currentStreak, bestStreak, streakGamification: streakGamification ?? (currentStreak >= 2 ? { ...EMPTY_GAMIFICATION_RESULT, streakUpdate: { current: currentStreak, isMilestone: false } } : null) };
}

/**
 * 既存ユーザーのデータからポイントを遡及計算してマイグレーション
 * ※ collectionGroup はインデックス要求されるため、直接パスで走査
 */
export async function migrateExistingUserPoints(uid: string): Promise<number> {
    const statsRef = adminDb.collection('users').doc(uid).collection('gamification').doc('stats');
    const existing = await statsRef.get();

    // 既にマイグレーション済みならスキップ
    if (existing.exists && (existing.data()?.totalPoints ?? 0) > 0) {
        return existing.data()!.totalPoints;
    }

    // ユーザーの所属サークルを取得
    const memberSnaps = await adminDb.collectionGroup('members').where('uid', '==', uid).get();
    const circleIds = memberSnaps.docs
        .map(d => d.ref.parent.parent?.id)
        .filter((id): id is string => !!id);
    const uniqueCircleIds = [...new Set(circleIds)];

    let attendanceCount = 0;
    let paymentCount = 0;
    let pollCount = 0;

    for (const circleId of uniqueCircleIds) {
        // 各サークルのイベントを取得
        const eventsSnap = await adminDb.collection(`circles/${circleId}/events`).get();
        for (const eventDoc of eventsSnap.docs) {
            // 出席チェック（直接ドキュメント取得 = インデックス不要）
            const attDoc = await adminDb
                .doc(`circles/${circleId}/events/${eventDoc.id}/attendance/${uid}`)
                .get();
            if (attDoc.exists && attDoc.data()?.attended === true) {
                attendanceCount++;
            }
            // 支払いチェック
            const payDoc = await adminDb
                .doc(`circles/${circleId}/events/${eventDoc.id}/payments/${uid}`)
                .get();
            if (payDoc.exists && payDoc.data()?.status === 'confirmed') {
                paymentCount++;
            }
        }
        // 投票チェック
        const pollsSnap = await adminDb.collection(`circles/${circleId}/polls`).get();
        for (const pollDoc of pollsSnap.docs) {
            const voteDoc = await adminDb
                .doc(`circles/${circleId}/polls/${pollDoc.id}/votes/${uid}`)
                .get();
            if (voteDoc.exists) {
                pollCount++;
            }
        }
    }

    const attendancePoints = attendanceCount * 10;
    const paymentPoints = paymentCount * 5;
    const pollPoints = pollCount * 3;
    const totalPoints = attendancePoints + paymentPoints + pollPoints;

    await statsRef.set({
        totalPoints,
        pointBreakdown: {
            attendance: attendancePoints,
            payment: paymentPoints,
            poll: pollPoints,
            earlyResponse: 0,
            streak: 0,
        },
        currentStreak: 0,
        bestStreak: 0,
        lastPointsEarnedAt: totalPoints > 0 ? new Date().toISOString() : '',
        updatedAt: FieldValue.serverTimestamp(),
    });

    // ストリークも計算
    await recalculateStreak(uid);

    // バッジチェック
    await checkAndGrantBadges(uid);

    // 最新のstatsを返す
    const updatedDoc = await statsRef.get();
    return updatedDoc.data()?.totalPoints ?? totalPoints;
}

// ── リーダーボード ──

export interface LeaderboardEntry {
    uid: string;
    displayName: string;
    photoURL: string | null;
    totalPoints: number;
    attendanceCount: number;
    updatedAt: string;
}

/**
 * サークル内リーダーボードを更新（ポイント付与時に呼び出す）
 */
export async function updateCircleLeaderboard(
    circleId: string,
    uid: string,
    pointsDelta: number
): Promise<void> {
    const lbRef = adminDb.collection('circles').doc(circleId).collection('leaderboard').doc(uid);
    const doc = await lbRef.get();

    if (doc.exists) {
        await lbRef.update({
            totalPoints: FieldValue.increment(pointsDelta),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else {
        // 新規エントリー: ユーザー情報を取得
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.data();
        await lbRef.set({
            uid,
            displayName: userData?.displayName ?? '不明',
            photoURL: userData?.photoURL ?? null,
            totalPoints: pointsDelta,
            attendanceCount: 0,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
}

/**
 * サークル内リーダーボードを取得
 */
export async function getCircleLeaderboard(
    circleId: string,
    limit: number = 10
): Promise<LeaderboardEntry[]> {
    const snap = await adminDb
        .collection('circles').doc(circleId)
        .collection('leaderboard')
        .orderBy('totalPoints', 'desc')
        .limit(limit)
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            uid: doc.id,
            displayName: data.displayName ?? '不明',
            photoURL: data.photoURL ?? null,
            totalPoints: data.totalPoints ?? 0,
            attendanceCount: data.attendanceCount ?? 0,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
        };
    });
}

// ── バッジシステム ──

/**
 * ユーザーの獲得済みバッジ一覧を取得
 */
export async function getUserBadges(uid: string): Promise<UserBadge[]> {
    const doc = await adminDb.collection('users').doc(uid).collection('gamification').doc('badges').get();
    if (!doc.exists) return [];
    const data = doc.data()!;
    return (data.badges ?? []) as UserBadge[];
}

/**
 * バッジを付与（既に持っている場合はスキップ）
 * 新規付与時は true を返す
 */
async function grantBadge(uid: string, badgeId: string): Promise<boolean> {
    const badgesRef = adminDb.collection('users').doc(uid).collection('gamification').doc('badges');
    const doc = await badgesRef.get();
    const existing: UserBadge[] = doc.exists ? (doc.data()?.badges ?? []) : [];

    if (existing.some(b => b.badgeId === badgeId)) return false;

    const newBadge: UserBadge = { badgeId, unlockedAt: new Date().toISOString() };
    await badgesRef.set({ badges: [...existing, newBadge] }, { merge: true });
    return true;
}

/**
 * ゲーミフィケーション統計とサークル情報からバッジ解除をチェック
 * 新たに解除されたバッジIDの配列を返す
 */
export async function checkAndGrantBadges(uid: string): Promise<string[]> {
    const stats = await getUserGamificationStats(uid);
    const breakdown = stats.pointBreakdown;
    const newBadges: string[] = [];

    // 出席系（pointBreakdown.attendance / 10 = 回数）
    const attendanceCount = Math.floor(breakdown.attendance / 10);
    if (attendanceCount >= 1 && await grantBadge(uid, 'first_attendance')) newBadges.push('first_attendance');
    if (attendanceCount >= 10 && await grantBadge(uid, 'attendance_10')) newBadges.push('attendance_10');
    if (attendanceCount >= 30 && await grantBadge(uid, 'attendance_30')) newBadges.push('attendance_30');
    if (attendanceCount >= 50 && await grantBadge(uid, 'attendance_50')) newBadges.push('attendance_50');

    // 支払い系（pointBreakdown.payment / 5 = 回数）
    const paymentCount = Math.floor(breakdown.payment / 5);
    if (paymentCount >= 1 && await grantBadge(uid, 'first_payment')) newBadges.push('first_payment');
    if (paymentCount >= 10 && await grantBadge(uid, 'payment_10')) newBadges.push('payment_10');

    // 投票系（pointBreakdown.poll / 3 = 回数）
    const pollCount = Math.floor(breakdown.poll / 3);
    if (pollCount >= 1 && await grantBadge(uid, 'first_poll')) newBadges.push('first_poll');
    if (pollCount >= 10 && await grantBadge(uid, 'poll_10')) newBadges.push('poll_10');

    // ストリーク系
    if (stats.bestStreak >= 3 && await grantBadge(uid, 'streak_3')) newBadges.push('streak_3');
    if (stats.bestStreak >= 5 && await grantBadge(uid, 'streak_5')) newBadges.push('streak_5');
    if (stats.bestStreak >= 10 && await grantBadge(uid, 'streak_10')) newBadges.push('streak_10');

    // 早期回答系（pointBreakdown.earlyResponse / 5 = 回数）
    const earlyCount = Math.floor(breakdown.earlyResponse / 5);
    if (earlyCount >= 5 && await grantBadge(uid, 'early_bird_5')) newBadges.push('early_bird_5');

    // ソーシャル系（サークル数）
    const membersSnap = await adminDb.collectionGroup('members').where('uid', '==', uid).get();
    const circleCount = new Set(membersSnap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean)).size;
    if (circleCount >= 2 && await grantBadge(uid, 'multi_circle_2')) newBadges.push('multi_circle_2');
    if (circleCount >= 3 && await grantBadge(uid, 'multi_circle_3')) newBadges.push('multi_circle_3');

    // ランク系
    const totalPoints = stats.totalPoints;
    if (totalPoints >= 30 && await grantBadge(uid, 'rank_regular')) newBadges.push('rank_regular');
    if (totalPoints >= 100 && await grantBadge(uid, 'rank_expert')) newBadges.push('rank_expert');
    if (totalPoints >= 250 && await grantBadge(uid, 'rank_master')) newBadges.push('rank_master');
    if (totalPoints >= 500 && await grantBadge(uid, 'rank_legend')) newBadges.push('rank_legend');

    return newBadges;
}

// ── デイリーログインストリーク ──

export interface LoginStreakResult {
    loginStreak: number;
    bestLoginStreak: number;
    bonusAwarded: number; // 0 = ボーナスなし
    isNewDay: boolean;
}

/**
 * ダッシュボード読み込み時に呼び出す。同じ日に2回目以降は何もしない。
 * 7日連続: +10pt, 30日連続: +30pt
 */
export async function recordDailyLogin(uid: string): Promise<LoginStreakResult> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const statsRef = adminDb.collection('users').doc(uid).collection('gamification').doc('stats');
    const doc = await statsRef.get();
    const data = doc.exists ? doc.data()! : {};

    const lastLoginDate = data.lastLoginDate ?? '';
    const currentLoginStreak = data.loginStreak ?? 0;
    const bestLoginStreak = data.bestLoginStreak ?? 0;

    // 同じ日ならスキップ
    if (lastLoginDate === today) {
        return {
            loginStreak: currentLoginStreak,
            bestLoginStreak,
            bonusAwarded: 0,
            isNewDay: false,
        };
    }

    // 昨日かどうか判定
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const isConsecutive = lastLoginDate === yesterdayStr;

    const newStreak = isConsecutive ? currentLoginStreak + 1 : 1;
    const newBest = Math.max(bestLoginStreak, newStreak);

    // マイルストーンボーナス
    let bonusAwarded = 0;
    if (newStreak === 7) bonusAwarded = 10;
    else if (newStreak === 30) bonusAwarded = 30;
    else if (newStreak > 0 && newStreak % 30 === 0) bonusAwarded = 30;

    const updateData: Record<string, unknown> = {
        loginStreak: newStreak,
        lastLoginDate: today,
        bestLoginStreak: newBest,
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (bonusAwarded > 0) {
        updateData['totalPoints'] = FieldValue.increment(bonusAwarded);
        updateData['pointBreakdown.streak'] = FieldValue.increment(bonusAwarded);
        updateData['lastPointsEarnedAt'] = new Date().toISOString();
    }

    await statsRef.set(updateData, { merge: true });

    // ログインストリークバッジ
    if (newStreak >= 7) {
        await grantBadge(uid, 'login_streak_7');
    }
    if (newStreak >= 30) {
        await grantBadge(uid, 'login_streak_30');
    }

    return {
        loginStreak: newStreak,
        bestLoginStreak: newBest,
        bonusAwarded,
        isNewDay: true,
    };
}

// ── バッジ取得ヘルパー ──

/**
 * ユーザーのトップバッジ（最新解除順）を取得
 */
export async function getTopBadges(uid: string, limit: number = 3): Promise<{ badgeId: string; emoji: string; name: string }[]> {
    const badgesDoc = await adminDb.collection('users').doc(uid).collection('gamification').doc('badges').get();
    if (!badgesDoc.exists) return [];

    const badges: { badgeId: string; unlockedAt: string }[] = badgesDoc.data()?.badges ?? [];

    // 最新解除順にソート
    const sorted = [...badges].sort((a, b) => {
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    });

    return sorted.slice(0, limit).map(b => {
        const def = BADGE_DEFINITIONS.find(d => d.id === b.badgeId);
        return {
            badgeId: b.badgeId,
            emoji: def?.emoji ?? '🏅',
            name: def?.name ?? b.badgeId,
        };
    });
}
