'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getCurrentUserRole } from '@/lib/actions/circle.actions';
import { getEvent } from '@/lib/actions/event.actions';
import { qrCheckIn } from '@/lib/actions/attendance.actions';
import type { Event } from '@/lib/types/models';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeft, Camera, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type ScanResult = {
    displayName: string;
    success: boolean;
    message: string;
};

export default function QRCheckInPage() {
    const params = useParams();
    const router = useRouter();
    const circleId = params['circleId'] as string;
    const eventId = params['eventId'] as string;
    const { user } = useAuthContext();

    const [event, setEvent] = useState<Event | null>(null);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [checkedInCount, setCheckedInCount] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            getEvent(circleId, eventId),
            getCurrentUserRole(circleId, user.uid),
        ]).then(([e, role]) => {
            setEvent(e);
            setIsOrganizer(role === 'organizer');
        }).finally(() => setLoading(false));
    }, [circleId, eventId, user]);

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanning(false);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleQRData = useCallback(async (data: string) => {
        if (processing || !user) return;

        try {
            const parsed = JSON.parse(data);
            if (parsed.type !== 'musubi_member' || !parsed.uid) {
                setLastResult({
                    displayName: '',
                    success: false,
                    message: '無効なQRコードです',
                });
                return;
            }

            setProcessing(true);
            const result = await qrCheckIn(circleId, eventId, parsed.uid, user.uid);

            if (result.success) {
                setLastResult({
                    displayName: result.displayName,
                    success: true,
                    message: `${result.displayName} さんのチェックイン完了！`,
                });
                setCheckedInCount(prev => prev + 1);
                toast.success(`${result.displayName} さんのチェックイン完了！`);
            } else {
                setLastResult({
                    displayName: result.displayName,
                    success: false,
                    message: `${result.displayName} さんは既にチェックイン済みです`,
                });
                toast.info(`${result.displayName} さんは既にチェックイン済みです`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'チェックインに失敗しました';
            setLastResult({
                displayName: '',
                success: false,
                message,
            });
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    }, [processing, user, circleId, eventId]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScanning(true);

            // jsQRをダイナミックインポート
            const jsQR = (await import('jsqr')).default;

            const scanFrame = () => {
                if (!videoRef.current || !canvasRef.current) return;

                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
                    animFrameRef.current = requestAnimationFrame(scanFrame);
                    return;
                }

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    handleQRData(code.data);
                }

                animFrameRef.current = requestAnimationFrame(scanFrame);
            };

            animFrameRef.current = requestAnimationFrame(scanFrame);
        } catch {
            toast.error('カメラへのアクセスが許可されていません');
        }
    }, [handleQRData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (!isOrganizer) {
        return (
            <div className="text-center">
                <p className="text-muted-foreground">QRチェックインはオーガナイザーのみ使用できます</p>
                <Link
                    href={`/circles/${circleId}/events/${eventId}`}
                    className="mt-4 inline-block text-sm underline"
                >
                    イベントに戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg space-y-6">
            {/* ヘッダー */}
            <div>
                <Link
                    href={`/circles/${circleId}/events/${eventId}`}
                    className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    イベントに戻る
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">📱 QRチェックイン</h1>
                {event && (
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        {event.name} — {formatDate(event.date)}
                    </p>
                )}
            </div>

            {/* チェックイン統計 */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">今回のチェックイン</span>
                    <span className="text-2xl font-bold tabular-nums">{checkedInCount}人</span>
                </div>
            </div>

            {/* カメラ表示エリア */}
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-black">
                {scanning ? (
                    <div className="relative aspect-square">
                        <video
                            ref={videoRef}
                            className="h-full w-full object-cover"
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        {/* スキャンフレーム */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-48 w-48 rounded-lg border-2 border-white/60" />
                        </div>
                        {processing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex aspect-square flex-col items-center justify-center gap-4 bg-neutral-50">
                        <Camera className="h-12 w-12 text-neutral-300" />
                        <p className="text-sm text-neutral-500">
                            カメラを起動してQRコードをスキャン
                        </p>
                    </div>
                )}
            </div>

            {/* 開始/停止ボタン */}
            <button
                onClick={scanning ? stopCamera : startCamera}
                className={`w-full rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                    scanning
                        ? 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                        : 'bg-foreground text-background hover:bg-neutral-800'
                }`}
            >
                {scanning ? '⏹ スキャンを停止' : '📷 スキャンを開始'}
            </button>

            {/* 最新結果 */}
            {lastResult && (
                <div
                    className={`flex items-center gap-3 rounded-lg border p-4 ${
                        lastResult.success
                            ? 'border-neutral-200 bg-neutral-50'
                            : 'border-neutral-200 bg-white'
                    }`}
                >
                    {lastResult.success ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-neutral-700" />
                    ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-neutral-400" />
                    )}
                    <span className="text-sm">{lastResult.message}</span>
                </div>
            )}
        </div>
    );
}
