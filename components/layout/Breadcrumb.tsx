'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCircle } from '@/lib/actions/circle.actions';
import { getEvent } from '@/lib/actions/event.actions';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const STATIC_LABELS: Record<string, string> = {
  circles: 'サークル',
  create: '新規作成',
  events: 'イベント',
  members: 'メンバー',
  guests: 'ゲスト管理',
  analytics: 'アナリティクス',
  polls: '日程調整',
  attendance: '出欠記録',
  payments: '集金状況',
  checkin: 'QRチェックイン',
  mypage: 'マイページ',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    buildBreadcrumbs(pathname).then(setItems);
  }, [pathname]);

  // Don't show on dashboard or mypage (top-level)
  if (pathname === '/dashboard' || pathname === '/mypage') return null;
  if (items.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center gap-1 text-[12px] text-muted-foreground">
      <Link href="/dashboard" className="flex items-center gap-1 transition-colors hover:text-foreground">
        <Home className="h-3 w-3" strokeWidth={1.5} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

async function buildBreadcrumbs(pathname: string): Promise<BreadcrumbItem[]> {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // /circles/create
  if (segments[0] === 'circles' && segments[1] === 'create') {
    items.push({ label: 'サークル作成' });
    return items;
  }

  // /circles/[circleId]/...
  if (segments[0] === 'circles' && segments[1]) {
    const circleId = segments[1];
    let circleName = 'サークル';
    try {
      const circle = await getCircle(circleId);
      if (circle) circleName = `${circle.emoji || ''} ${circle.name}`.trim();
    } catch { /* fallback */ }

    items.push({
      label: circleName,
      href: `/circles/${circleId}`,
    });

    // /circles/[id]/events/create
    if (segments[2] === 'events' && segments[3] === 'create') {
      items.push({ label: 'イベント作成' });
      return items;
    }

    // /circles/[id]/events/[eventId]/...
    if (segments[2] === 'events' && segments[3]) {
      const eventId = segments[3];
      let eventName = 'イベント';
      try {
        const event = await getEvent(circleId, eventId);
        if (event) eventName = event.name;
      } catch { /* fallback */ }

      items.push({
        label: eventName,
        href: `/circles/${circleId}/events/${eventId}`,
      });

      // /circles/[id]/events/[id]/attendance etc.
      if (segments[4]) {
        const label = STATIC_LABELS[segments[4]] || segments[4];
        items.push({ label });
      }
      return items;
    }

    // /circles/[id]/polls/create
    if (segments[2] === 'polls' && segments[3] === 'create') {
      items.push({ label: '日程調整を作成' });
      return items;
    }

    // /circles/[id]/polls/[pollId]
    if (segments[2] === 'polls' && segments[3]) {
      items.push({ label: '日程調整' });
      return items;
    }

    // /circles/[id]/members, /circles/[id]/guests, etc.
    if (segments[2]) {
      const label = STATIC_LABELS[segments[2]] || segments[2];
      items.push({ label });
    }
  }

  return items;
}
