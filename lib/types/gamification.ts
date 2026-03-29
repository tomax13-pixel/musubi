import type { Timestamp } from 'firebase/firestore';

// ── ゲーミフィケーション即時フィードバック ──
export interface GamificationResult {
    pointsAwarded: { type: string; points: number }[];
    totalPointsAfter: number;
    newBadges: string[];       // 新たに解除されたバッジID
    rankUp: { from: string; to: string } | null;
    streakUpdate: { current: number; isMilestone: boolean } | null;
    bonusMultiplier: number | null;  // null = 通常, 2/3/5 = ボーナス倍率
}

export const EMPTY_GAMIFICATION_RESULT: GamificationResult = {
    pointsAwarded: [],
    totalPointsAfter: 0,
    newBadges: [],
    rankUp: null,
    streakUpdate: null,
    bonusMultiplier: null,
};

/**
 * 複数のGamificationResultをマージする（同期関数 — 'use server' ファイルからは export 不可のためここに配置）
 */
export function mergeGamificationResults(...results: GamificationResult[]): GamificationResult {
    const merged: GamificationResult = { ...EMPTY_GAMIFICATION_RESULT, pointsAwarded: [], newBadges: [] };
    for (const r of results) {
        merged.pointsAwarded.push(...r.pointsAwarded);
        merged.newBadges.push(...r.newBadges);
        merged.totalPointsAfter = Math.max(merged.totalPointsAfter, r.totalPointsAfter);
        if (r.rankUp) merged.rankUp = r.rankUp;
        if (r.streakUpdate) merged.streakUpdate = r.streakUpdate;
        if (r.bonusMultiplier) merged.bonusMultiplier = r.bonusMultiplier;
    }
    // バッジ重複排除
    merged.newBadges = [...new Set(merged.newBadges)];
    return merged;
}

export interface UserGamificationStats {
    totalPoints: number;
    pointBreakdown: {
        attendance: number;
        payment: number;
        poll: number;
        earlyResponse: number;
        streak: number;
    };
    currentStreak: number;
    bestStreak: number;
    loginStreak: number;
    lastLoginDate: string; // YYYY-MM-DD
    bestLoginStreak: number;
    lastPointsEarnedAt: string; // ISO date
    updatedAt: Timestamp | string;
}

export interface PointEvent {
    type: 'attendance' | 'payment' | 'poll' | 'earlyResponse' | 'streak';
    points: number;
    eventId?: string;
    circleId?: string;
}

export const RANK_THRESHOLDS = [
    { name: 'Beginner', minPoints: 0, style: 'bg-neutral-200 text-neutral-600' },
    { name: 'Regular', minPoints: 30, style: 'bg-neutral-700 text-white' },
    { name: 'Expert', minPoints: 100, style: 'bg-neutral-900 text-white' },
    { name: 'Master', minPoints: 250, style: 'bg-black text-white ring-1 ring-neutral-300' },
    { name: 'Legend', minPoints: 500, style: 'bg-gradient-to-r from-neutral-900 to-neutral-700 text-white ring-1 ring-neutral-400' },
] as const;

export type RankName = typeof RANK_THRESHOLDS[number]['name'];

// ── バッジ定義 ──
export interface Badge {
    id: string;
    name: string;
    description: string;
    emoji: string;
    category: 'attendance' | 'payment' | 'poll' | 'streak' | 'social' | 'rank';
}

export const BADGE_DEFINITIONS: Badge[] = [
    // 出席系
    { id: 'first_attendance', name: 'はじめの一歩', description: '初めてイベントに参加', emoji: '👣', category: 'attendance' },
    { id: 'attendance_10', name: '常連さん', description: '10回イベントに参加', emoji: '🏠', category: 'attendance' },
    { id: 'attendance_30', name: '皆勤の星', description: '30回イベントに参加', emoji: '⭐', category: 'attendance' },
    { id: 'attendance_50', name: 'イベントマニア', description: '50回イベントに参加', emoji: '🏆', category: 'attendance' },
    // 支払い系
    { id: 'first_payment', name: '初めてのお会計', description: '初めて支払いを完了', emoji: '💰', category: 'payment' },
    { id: 'payment_10', name: '支払いマスター', description: '10回支払いを完了', emoji: '💎', category: 'payment' },
    // 投票系
    { id: 'first_poll', name: '一票の声', description: '初めて投票に参加', emoji: '🗳️', category: 'poll' },
    { id: 'poll_10', name: '投票の達人', description: '10回投票に参加', emoji: '📊', category: 'poll' },
    // ストリーク系
    { id: 'streak_3', name: 'ハットトリック', description: '3回連続出席', emoji: '🔥', category: 'streak' },
    { id: 'streak_5', name: 'ストリーカー', description: '5回連続出席', emoji: '⚡', category: 'streak' },
    { id: 'streak_10', name: '鉄人', description: '10回連続出席', emoji: '🦾', category: 'streak' },
    // ソーシャル系
    { id: 'multi_circle_2', name: 'ダブルサークラー', description: '2つのサークルに所属', emoji: '🤝', category: 'social' },
    { id: 'multi_circle_3', name: 'マルチサークラー', description: '3つ以上のサークルに所属', emoji: '🌐', category: 'social' },
    { id: 'early_bird_5', name: '早起き鳥', description: '5回早期回答ボーナス獲得', emoji: '🐦', category: 'social' },
    // ランク系
    { id: 'rank_regular', name: 'Regular到達', description: 'Regularランクに到達', emoji: '🥈', category: 'rank' },
    { id: 'rank_expert', name: 'Expert到達', description: 'Expertランクに到達', emoji: '🥇', category: 'rank' },
    { id: 'rank_master', name: 'Master到達', description: 'Masterランクに到達', emoji: '👑', category: 'rank' },
    { id: 'rank_legend', name: 'Legend到達', description: 'Legendランクに到達', emoji: '🏅', category: 'rank' },
    // ログインストリーク系
    { id: 'login_streak_7', name: '一週間の習慣', description: '7日連続ログイン', emoji: '📅', category: 'streak' },
    { id: 'login_streak_30', name: '30日の鉄人', description: '30日連続ログイン', emoji: '🗓️', category: 'streak' },
];

export interface UserBadge {
    badgeId: string;
    unlockedAt: string; // ISO date
}

/**
 * ポイントからランクを計算（純粋関数 — クライアントでも使用可能）
 */
export function calculatePointRank(totalPoints: number): { name: string; style: string; nextRank: { name: string; minPoints: number } | null; progress: number } {
    let currentRank: { name: string; minPoints: number; style: string } = RANK_THRESHOLDS[0]!;
    let nextRank: { name: string; minPoints: number; style: string } | null = null;

    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalPoints >= RANK_THRESHOLDS[i]!.minPoints) {
            currentRank = RANK_THRESHOLDS[i]!;
            nextRank = i < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[i + 1]! : null;
            break;
        }
    }

    // プログレス計算（次のランクまでの進捗 0-100）
    let progress = 100;
    if (nextRank) {
        const currentMin = currentRank.minPoints;
        const nextMin = nextRank.minPoints;
        progress = Math.min(100, Math.round(((totalPoints - currentMin) / (nextMin - currentMin)) * 100));
    }

    return {
        name: currentRank.name,
        style: currentRank.style,
        nextRank: nextRank ? { name: nextRank.name, minPoints: nextRank.minPoints } : null,
        progress,
    };
}
