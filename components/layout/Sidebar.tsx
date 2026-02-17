'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { href: '/dashboard', label: 'ホーム', emoji: '🏠' },
  { href: '/mypage', label: 'マイページ', emoji: '👤' },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuthContext();

  return (
    <div className="flex h-full flex-col p-3">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold tracking-tight">結</span>
          <span className="text-[11px] text-muted-foreground">むすび</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 md:hidden">
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, emoji }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-neutral-100 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-neutral-50 hover:text-foreground'
            )}
          >
            <span className="text-base leading-none">{emoji}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* User info + sign out */}
      {user && (
        <div className="border-t pt-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.photoURL ?? undefined} />
              <AvatarFallback className="text-[10px]">{user.displayName?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{user.displayName}</p>
            </div>
          </div>
          <button
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-neutral-50 hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
