import { toast } from 'sonner';
import type { GamificationResult } from '@/lib/types/gamification';
import { BADGE_DEFINITIONS } from '@/lib/types/gamification';

/**
 * GamificationResult を受け取り、sonner トーストで即時フィードバックを表示する
 * 行動→報酬を1秒以内に接続するドーパミンハックの中核
 */
export function showGamificationToast(result: GamificationResult | null | undefined) {
    if (!result) return;

    // ── ランダムボーナス（最も目立つ、最初に表示） ──
    if (result.bonusMultiplier) {
        const label =
            result.bonusMultiplier >= 5
                ? '🎰 ウルトラレア! 5倍ポイント!'
                : result.bonusMultiplier >= 3
                  ? '🎰 スーパーラッキー! トリプルポイント!'
                  : '🎰 ラッキー! ダブルポイント!';

        toast.success(label, {
            duration: 4000,
            style: {
                fontSize: '16px',
                fontWeight: 700,
                border: '2px solid #000',
            },
        });
    }

    // ── ポイント獲得 ──
    const totalPoints = result.pointsAwarded.reduce((sum, p) => sum + p.points, 0);
    if (totalPoints > 0) {
        const typeLabels: Record<string, string> = {
            attendance: '出席',
            payment: '支払い',
            poll: '投票',
            earlyResponse: '早期回答ボーナス',
            streak: 'ストリークボーナス',
        };

        const details = result.pointsAwarded
            .map((p) => typeLabels[p.type] || p.type)
            .join(' + ');

        toast(`+ ${totalPoints} pt`, {
            description: details,
            duration: 2500,
        });
    }

    // ── バッジ解除 ──
    for (const badgeId of result.newBadges) {
        const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
        if (badge) {
            toast.success(`${badge.emoji} バッジ獲得: ${badge.name}`, {
                description: badge.description,
                duration: 4000,
            });
        }
    }

    // ── ランクアップ ──
    if (result.rankUp) {
        toast.success(`⭐ ランクアップ!`, {
            description: `${result.rankUp.from} → ${result.rankUp.to}`,
            duration: 5000,
            style: {
                fontSize: '16px',
                fontWeight: 700,
            },
        });
    }

    // ── ストリークマイルストーン ──
    if (result.streakUpdate?.isMilestone) {
        toast(`🔥 ${result.streakUpdate.current}回連続出席!`, {
            duration: 3000,
        });
    }
}
