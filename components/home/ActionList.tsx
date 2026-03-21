'use client';

import Link from 'next/link';
import { CircleCheck, Banknote, Vote } from 'lucide-react';
import { CircleIcon } from '@/components/circles/CircleIcon';
import { motion } from 'framer-motion';

interface ActionItem {
  type: 'attendance' | 'payment' | 'poll';
  circleId: string;
  circleName: string;
  circleEmoji: string;
  eventId?: string;
  pollId?: string;
  title: string;
  subtitle: string;
  date?: string;
}

const typeConfig = {
  attendance: {
    icon: CircleCheck,
    label: '出欠未回答',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  payment: {
    icon: Banknote,
    label: '未払い',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  poll: {
    icon: Vote,
    label: '日程調整',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
};

function getActionHref(action: ActionItem): string {
  if (action.type === 'attendance' && action.eventId) {
    return `/circles/${action.circleId}/events/${action.eventId}`;
  }
  if (action.type === 'payment' && action.eventId) {
    return `/circles/${action.circleId}/events/${action.eventId}`;
  }
  if (action.type === 'poll' && action.pollId) {
    return `/circles/${action.circleId}/polls/${action.pollId}`;
  }
  return `/circles/${action.circleId}`;
}

export function ActionList({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-8 text-center">
        <span className="text-2xl">✅</span>
        <p className="text-[13px] text-muted-foreground">やることはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {actions.map((action, i) => {
        const config = typeConfig[action.type];
        const Icon = config.icon;
        const href = getActionHref(action);

        return (
          <motion.div
            key={`${action.type}-${action.eventId || action.pollId}-${action.circleId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={href}
              className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-3.5 py-3 transition-all hover:border-neutral-200 hover:shadow-sm active:scale-[0.99]"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
                <Icon className={`h-4 w-4 ${config.color}`} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{action.title}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CircleIcon emoji={action.circleEmoji} size={14} />
                  <span className="truncate">{action.circleName} · {action.subtitle}</span>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
