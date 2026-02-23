'use client';

import { useState } from 'react';
import {
    sendPaymentReminder,
    sendAttendanceReminder,
    sendNotificationToAllMembers,
} from '@/lib/actions/notification.actions';
import type { NotificationType } from '@/lib/actions/notification.actions';

type NotificationOption = {
    type: NotificationType;
    label: string;
    defaultTitle: string;
    defaultBody: (eventName: string) => string;
    targetLabel: string;
};

const NOTIFICATION_OPTIONS: NotificationOption[] = [
    {
        type: 'payment_reminder',
        label: '💰 支払いリマインダー',
        defaultTitle: '💰 お支払いのお願い',
        defaultBody: (n) => `「${n}」の参加費がまだ未払いです。確認をお願いします。`,
        targetLabel: '未払いメンバーのみに送信',
    },
    {
        type: 'attendance_reminder',
        label: '📋 出欠確認リマインダー',
        defaultTitle: '📋 出欠確認のお願い',
        defaultBody: (n) => `「${n}」の出欠がまだ未回答です。ご回答をお願いします。`,
        targetLabel: '未回答メンバーのみに送信',
    },
    {
        type: 'event_created',
        label: '📣 全メンバーへのお知らせ',
        defaultTitle: '📣 お知らせ',
        defaultBody: (n) => `「${n}」に関するお知らせです。`,
        targetLabel: '全メンバーに送信',
    },
];

interface Props {
    circleId: string;
    eventId: string;
    eventName: string;
    currentUserUid: string;
}

export function SendNotificationPanel({ circleId, eventId, eventName, currentUserUid }: Props) {
    const [selectedType, setSelectedType] = useState<NotificationType>('payment_reminder');
    const [title, setTitle] = useState('💰 お支払いのお願い');
    const [body, setBody] = useState(
        `「${eventName}」の参加費がまだ未払いです。確認をお願いします。`
    );
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ successCount: number; failureCount: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    function handleTypeChange(type: NotificationType) {
        setSelectedType(type);
        const option = NOTIFICATION_OPTIONS.find((o) => o.type === type)!;
        setTitle(option.defaultTitle);
        setBody(option.defaultBody(eventName));
        setResult(null);
        setError(null);
    }

    async function handleSend() {
        setSending(true);
        setResult(null);
        setError(null);

        try {
            let res: { successCount: number; failureCount: number };

            if (selectedType === 'payment_reminder') {
                res = await sendPaymentReminder(circleId, eventId, currentUserUid, title, body);
            } else if (selectedType === 'attendance_reminder') {
                res = await sendAttendanceReminder(circleId, eventId, currentUserUid, title, body);
            } else {
                res = await sendNotificationToAllMembers(
                    circleId,
                    selectedType,
                    title,
                    body,
                    currentUserUid,
                    eventId
                );
            }

            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : '送信中にエラーが発生しました');
        } finally {
            setSending(false);
        }
    }

    const selectedOption = NOTIFICATION_OPTIONS.find((o) => o.type === selectedType)!;

    return (
        <div className="border border-neutral-200 rounded-md p-4 space-y-3">
            <h3 className="text-[13px] font-semibold text-neutral-700">🔔 通知を送る</h3>

            {/* 通知タイプ選択 */}
            <div className="space-y-1">
                <label className="text-[12px] text-neutral-500">通知の種類</label>
                <div className="flex flex-col gap-1">
                    {NOTIFICATION_OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            onClick={() => handleTypeChange(opt.type)}
                            className={`text-left text-[12px] px-3 py-2 rounded-md border transition-colors ${selectedType === opt.type
                                    ? 'border-neutral-800 bg-neutral-800 text-white'
                                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            {opt.label}
                            <span className="ml-2 opacity-60 text-[11px]">（{opt.targetLabel}）</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* タイトル入力 */}
            <div className="space-y-1">
                <label className="text-[12px] text-neutral-500">タイトル</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
                    placeholder="通知のタイトル"
                />
            </div>

            {/* 本文入力 */}
            <div className="space-y-1">
                <label className="text-[12px] text-neutral-500">本文</label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 outline-none focus:border-neutral-400 transition-colors resize-none"
                    placeholder="通知の本文"
                />
            </div>

            {/* 送信ボタン */}
            <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full text-[13px] px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {sending ? '送信中…' : '送信する'}
            </button>

            {/* 結果表示 */}
            {result && (
                <div
                    className={`text-[12px] rounded-md px-3 py-2 ${result.failureCount === 0 && result.successCount > 0
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : result.successCount === 0
                                ? 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                >
                    {result.successCount === 0 && result.failureCount === 0 ? (
                        '送信対象のメンバーがいませんでした（全員受信済みか、通知未許可）'
                    ) : (
                        <>
                            ✅ {result.successCount}人に送信しました
                            {result.failureCount > 0 && `（⚠️ ${result.failureCount}人は失敗）`}
                        </>
                    )}
                </div>
            )}

            {error && (
                <div className="text-[12px] rounded-md px-3 py-2 bg-red-50 text-red-700 border border-red-200">
                    ❌ {error}
                </div>
            )}
        </div>
    );
}
