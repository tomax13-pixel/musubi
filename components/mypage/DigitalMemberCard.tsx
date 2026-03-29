'use client';

import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface DigitalMemberCardProps {
    userId: string;
    displayName: string;
}

export function DigitalMemberCard({ userId, displayName }: DigitalMemberCardProps) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <QrCode className="h-3.5 w-3.5" />
                デジタル会員証
            </div>
            <div className="mt-4 flex flex-col items-center gap-4">
                <div className="rounded-lg border border-neutral-100 bg-white p-4">
                    <QRCodeSVG
                        value={JSON.stringify({ type: 'musubi_member', uid: userId })}
                        size={160}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                    />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                        イベント会場でこのQRコードを幹事に見せてチェックインしてください
                    </p>
                </div>
            </div>
        </div>
    );
}
