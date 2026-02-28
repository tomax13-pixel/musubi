'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { createInviteCode } from '@/lib/actions/invite.actions';
import { toast } from 'sonner';
import { Link2, Copy, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface InviteLinkButtonProps {
    circleId: string;
    currentUserUid: string;
}

export function InviteLinkButton({ circleId, currentUserUid }: InviteLinkButtonProps) {
    const [open, setOpen] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const handleOpen = async (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen && !inviteUrl) {
            setIsLoading(true);
            try {
                const result = await createInviteCode(circleId, currentUserUid);
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                setInviteUrl(`${baseUrl}/invite/${result.code}`);
                if (result.expiresAt) {
                    setExpiresAt(new Date(result.expiresAt).toLocaleDateString('ja-JP'));
                }
            } catch (error: any) {
                toast.error(error.message || '招待リンクの作成に失敗しました');
                setOpen(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success('リンクをコピーしました');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('コピーに失敗しました');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <button
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-neutral-50"
                >
                    🔗 招待リンク
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>招待リンク</DialogTitle>
                    <DialogDescription>
                        このリンクを共有して、メンバーを招待できます
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* リンクコピー欄 */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 truncate rounded-md border bg-neutral-50 px-3 py-2 text-[13px] text-neutral-600">
                                {inviteUrl}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* 有効期限 */}
                        {expiresAt && (
                            <p className="text-[12px] text-muted-foreground">
                                🕐 有効期限: {expiresAt} まで
                            </p>
                        )}

                        {/* QRコード表示トグル */}
                        <div className="border-t pt-4">
                            <button
                                onClick={() => setShowQR(!showQR)}
                                className="flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <QrCode className="h-4 w-4" />
                                {showQR ? 'QRコードを隠す' : 'QRコードを表示'}
                            </button>

                            {showQR && inviteUrl && (
                                <div className="mt-4 flex justify-center rounded-md border bg-white p-6">
                                    <QRCodeSVG
                                        value={inviteUrl}
                                        size={180}
                                        level="M"
                                        includeMargin={false}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
