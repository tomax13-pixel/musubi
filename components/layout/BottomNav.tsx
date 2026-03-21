'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const tabs = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/schedule', label: '予定', icon: Calendar },
  { href: '/notifications', label: '通知', icon: Bell },
  { href: '/mypage', label: 'マイページ', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon
                className={cn('h-5 w-5', isActive && 'stroke-[2.5]')}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={cn('leading-none', isActive && 'font-semibold')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
