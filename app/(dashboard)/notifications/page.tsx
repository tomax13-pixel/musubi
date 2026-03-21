'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { motion } from 'framer-motion';

export default function NotificationsPage() {
  const { user } = useAuthContext();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">🔔 通知</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          お知らせ・リマインダー
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-200 py-16 text-center bg-neutral-50/50"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
          <Bell className="h-7 w-7 text-neutral-400" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[15px] font-medium">通知はまだありません</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            イベントのお知らせやリマインダーがここに表示されます
          </p>
        </div>
      </motion.div>
    </div>
  );
}
