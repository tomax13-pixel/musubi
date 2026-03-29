'use client';

import Link from 'next/link';
import { DollarSign, ChevronRight } from 'lucide-react';
import type { PaymentRecord } from '@/lib/types/models';

interface PaymentSummaryProps {
    paymentHistory: PaymentRecord[];
    totalPaid: number;
}

export function PaymentSummary({ paymentHistory, totalPaid }: PaymentSummaryProps) {
    const unpaidPayments = paymentHistory.filter((p) => p.status === 'unpaid');
    const pendingPayments = paymentHistory.filter((p) => p.status === 'pending_confirmation');
    const unpaidTotal = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
    const hasUnpaid = unpaidPayments.length > 0;
    const hasPending = pendingPayments.length > 0;

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <DollarSign className="h-3.5 w-3.5" />
                支払いサマリー
            </div>
            <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold">¥{totalPaid.toLocaleString()}</span>
                <span className="text-sm text-neutral-500">累計支払</span>
            </div>

            {/* ステータスバッジ */}
            <div className="mt-3 flex flex-wrap gap-2">
                {hasUnpaid && (
                    <div className="inline-flex items-center rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                        未払い: {unpaidPayments.length}件 ¥{unpaidTotal.toLocaleString()}
                    </div>
                )}
                {hasPending && (
                    <div className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                        確認待ち: {pendingPayments.length}件
                    </div>
                )}
                {!hasUnpaid && !hasPending && (
                    <div className="inline-block rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        ステータス: すべて完了
                    </div>
                )}
            </div>

            {/* 未払いイベントリスト */}
            {hasUnpaid && (
                <div className="mt-4 space-y-1.5">
                    <p className="text-xs font-medium text-neutral-500">未払いのイベント</p>
                    {unpaidPayments.map((p) => (
                        <Link
                            key={p.id}
                            href={`/circles/${p.circleId}/events/${p.eventId}`}
                            className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors hover:bg-neutral-50"
                        >
                            <span className="text-neutral-700">{p.displayName || 'イベント'}</span>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">¥{p.amount.toLocaleString()}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
