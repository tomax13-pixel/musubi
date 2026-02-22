'use client';

import { useState } from 'react';
import { CircleMember } from '@/lib/types/models';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCog, UserMinus, Shield, ShieldOff } from 'lucide-react';
import {
    promoteToOrganizerAdmin,
    demoteToMemberAdmin,
    removeMemberFromCircleAdmin
} from '@/lib/actions/admin.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface MemberCardProps {
    circleId: string;
    member: CircleMember;
    currentUserUid: string;
    currentUserRole: 'organizer' | 'member' | null;
}

export function MemberCard({ circleId, member, currentUserUid, currentUserRole }: MemberCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const isSelf = member.uid === currentUserUid;
    const isOrganizer = member.role === 'organizer';
    const canManage = currentUserRole === 'organizer' && !isSelf;

    const handlePromote = async () => {
        if (!confirm(`${member.displayName} を幹事に昇格させますか？`)) return;
        setIsLoading(true);
        try {
            await promoteToOrganizerAdmin(circleId, member.uid, currentUserUid);
            toast.success(`${member.displayName} を幹事に昇格させました`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('昇格に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemote = async () => {
        if (!confirm(`${member.displayName} をメンバーに降格させますか？`)) return;
        setIsLoading(true);
        try {
            await demoteToMemberAdmin(circleId, member.uid, currentUserUid);
            toast.success(`${member.displayName} をメンバーに降格させました`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('降格に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm(`${member.displayName} をサークルから削除しますか？`)) return;
        setIsLoading(true);
        try {
            await removeMemberFromCircleAdmin(circleId, member.uid, currentUserUid);
            toast.success(`${member.displayName} を削除しました`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('削除に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={member.photoURL || ''} alt={member.displayName} />
                    <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{member.displayName}</p>
                        {isOrganizer && (
                            <Badge variant="secondary" className="text-xs">
                                幹事
                            </Badge>
                        )}
                        {isSelf && (
                            <Badge variant="outline" className="text-xs">
                                あなた
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
            </div>

            {canManage && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isOrganizer ? (
                            <DropdownMenuItem onClick={handleDemote}>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                メンバーに降格
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={handlePromote}>
                                <Shield className="mr-2 h-4 w-4" />
                                幹事に昇格
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                            <UserMinus className="mr-2 h-4 w-4" />
                            サークルから削除
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
