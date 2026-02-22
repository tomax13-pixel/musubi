'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import {
    getCircleAdmin,
    getCurrentUserRoleAdmin,
    getCircleMembersAdmin,
} from '@/lib/actions/admin.actions';
import type { Circle, CircleMember } from '@/lib/types/models';
import { MemberCard } from '@/components/circles/MemberCard';
import { InviteMemberDialog } from '@/components/circles/InviteMemberDialog';

export default function MembersPage() {
    const params = useParams();
    const circleId = params['circleId'] as string;
    const { user } = useAuthContext();

    const [circle, setCircle] = useState<Circle | null>(null);
    const [members, setMembers] = useState<CircleMember[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<'organizer' | 'member' | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        if (!user) return;
        Promise.all([
            getCircleAdmin(circleId),
            getCurrentUserRoleAdmin(circleId, user.uid),
            getCircleMembersAdmin(circleId),
        ]).then(([c, role, m]) => {
            setCircle(c as any); // Cast because of serialization diffs
            setCurrentUserRole(role);

            // Sort members: Organizers first, then by name
            const sortedMembers = (m as any[]).sort((a: any, b: any) => {
                if (a.role === b.role) {
                    return a.displayName.localeCompare(b.displayName);
                }
                return a.role === 'organizer' ? -1 : 1;
            });
            setMembers(sortedMembers);
        }).finally(() => setLoading(false));
    }, [circleId, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 w-full animate-pulse rounded bg-neutral-50" />
                ))}
            </div>
        </div>;
    }

    if (!circle) return <p className="text-muted-foreground">サークルが見つかりません</p>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Link
                        href={`/circles/${circleId}`}
                        className="mb-2 flex items-center text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        戻る
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight">メンバー管理</h1>
                    {/* Members count might update later */}
                    <p className="text-sm text-muted-foreground">
                        {circle.name} のメンバー ({members.length}人)
                    </p>
                </div>
                {currentUserRole === 'organizer' && (
                    <InviteMemberDialog circleId={circleId} currentUserUid={user!.uid} />
                )}
            </div>

            {/* Member List */}
            <div className="grid gap-4">
                {members.map((member) => (
                    <MemberCard
                        key={member.uid}
                        circleId={circleId}
                        member={member}
                        currentUserUid={user!.uid}
                        currentUserRole={currentUserRole}
                    />
                ))}
            </div>
        </div>
    );
}
