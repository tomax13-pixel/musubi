'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { storage } from '@/lib/firebase/clientApp';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserProfileAdmin } from '@/lib/actions/profile.actions';
import { updateUserProfile } from '@/lib/actions/user.actions';
import { Edit, BadgeCheck, Flame } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/types/models';

interface ProfileHeaderProps {
    profile: UserProfile;
    rank: string;
    rankStyle: string;
    streak: number;
    hasUnpaid: boolean;
    userId: string;
    onProfileUpdate: () => void;
}

export function ProfileHeader({ profile, rank, rankStyle, streak, hasUnpaid, userId, onProfileUpdate }: ProfileHeaderProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editFaculty, setEditFaculty] = useState('');
    const [editGrade, setEditGrade] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // ランクアップ検出（toast通知）
    useEffect(() => {
        const savedRank = localStorage.getItem(`rank_${userId}`);
        if (savedRank && savedRank !== rank) {
            toast(`ランクアップ！ → ${rank}`, {
                description: 'おめでとうございます！',
                duration: 4000,
            });
        }
        localStorage.setItem(`rank_${userId}`, rank);
    }, [rank, userId]);

    const handleSaveProfile = async () => {
        if (!profile) return;
        setUploading(true);
        try {
            let photoURL = profile.photoURL ?? null;

            if (avatarFile) {
                const storageRef = ref(storage, `profile_images/${userId}/avatar`);
                await uploadBytes(storageRef, avatarFile);
                photoURL = await getDownloadURL(storageRef);
            }

            await updateUserProfileAdmin(userId, {
                displayName: editDisplayName.trim() || profile.displayName,
                photoURL,
            });

            await updateUserProfile(userId, {
                faculty: editFaculty,
                grade: editGrade,
            });

            setDialogOpen(false);
            onProfileUpdate();
        } catch (error) {
            console.error('プロフィール更新エラー:', error);
            toast.error('プロフィールの更新に失敗しました');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.photoURL ?? undefined} />
                    <AvatarFallback className="text-xl font-semibold">
                        {profile.displayName.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold tracking-tight">{profile.displayName}</h1>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="rounded-md p-2 transition-colors hover:bg-neutral-100"
                                onClick={() => {
                                    setEditDisplayName(profile.displayName);
                                    setAvatarPreview(profile.photoURL ?? null);
                                    setAvatarFile(null);
                                    setEditFaculty(profile.faculty ?? '');
                                    setEditGrade(profile.grade ?? '');
                                }}
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>プロフィール編集</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {/* アバター写真 */}
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={avatarPreview ?? undefined} />
                                        <AvatarFallback className="text-xl">
                                            {editDisplayName.charAt(0) || profile.displayName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50">
                                        写真を変更
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }}
                                        />
                                    </label>
                                </div>
                                {/* 名前 */}
                                <div>
                                    <Label htmlFor="displayName">名前</Label>
                                    <input
                                        id="displayName"
                                        className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                        value={editDisplayName}
                                        onChange={(e) => setEditDisplayName(e.target.value)}
                                        placeholder="名前を入力"
                                        maxLength={30}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="faculty">学部</Label>
                                    <input
                                        id="faculty"
                                        className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                        value={editFaculty}
                                        onChange={(e) => setEditFaculty(e.target.value)}
                                        placeholder="例：経済学部"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grade">学年</Label>
                                    <select
                                        id="grade"
                                        className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                        value={editGrade}
                                        onChange={(e) => setEditGrade(e.target.value)}
                                    >
                                        <option value="">選択してください</option>
                                        <option value="1年生">1年生</option>
                                        <option value="2年生">2年生</option>
                                        <option value="3年生">3年生</option>
                                        <option value="4年生">4年生</option>
                                        <option value="既卒">既卒</option>
                                    </select>
                                </div>
                                <Button onClick={handleSaveProfile} disabled={uploading} className="w-full">
                                    {uploading ? '保存中...' : '保存'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {profile.faculty && profile.grade && (
                <p className="text-sm text-gray-500">
                    {profile.faculty} / {profile.grade}
                </p>
            )}

            <div className="flex items-center gap-2">
                <div className={`inline-block rounded-md px-3 py-1 text-xs font-medium ${rankStyle}`}>
                    {rank}
                </div>
                {streak >= 3 && (
                    <div className="flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        <Flame className="h-3.5 w-3.5" />
                        {streak}連続
                    </div>
                )}
                {!hasUnpaid && (
                    <div className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified Member
                    </div>
                )}
            </div>
        </div>
    );
}
