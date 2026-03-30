import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';
import type { PaymentStatus } from '@/lib/types/models';

const STATUS_STYLES: Record<PaymentStatus, { label: string; className: string; dot?: string; icon?: boolean }> = {
  unpaid: {
    label: '未払い',
    className: 'border-neutral-900 text-neutral-900 bg-white',
    dot: 'bg-neutral-900',
  },
  pending_confirmation: {
    label: '確認待ち',
    className: 'border-transparent bg-neutral-200 text-neutral-600',
    dot: 'bg-neutral-500 animate-pulse',
  },
  confirmed: {
    label: '確認済み',
    className: 'border-transparent bg-neutral-100 text-neutral-300',
    icon: true,
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        config.className
      )}
    >
      {config.dot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
      {config.icon && <Check className="h-3 w-3" strokeWidth={2} />}
      {config.label}
    </span>
  );
}
