'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addMemberToCircleAdmin } from '@/lib/actions/admin.actions';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InviteMemberDialogProps {
    circleId: string;
    currentUserUid: string;
}

export function InviteMemberDialog({ circleId, currentUserUid }: InviteMemberDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            await addMemberToCircleAdmin(circleId, email, currentUserUid);
            toast.success('メンバーを追加しました');
            setOpen(false);
            setEmail('');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'メンバーの追加に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    メンバー招待
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>メンバーを招待</DialogTitle>
                    <DialogDescription>
                        招待したいユーザーの登録メールアドレスを入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? '追加中...' : '追加'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
