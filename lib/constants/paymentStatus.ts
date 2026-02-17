import type { PaymentStatus } from '@/lib/types/models';

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; emoji: string; variant: 'destructive' | 'secondary' | 'default' | 'outline'; color: string }
> = {
  unpaid: { label: '未払い', emoji: '', variant: 'outline', color: 'text-neutral-900' },
  pending_confirmation: { label: '確認待ち', emoji: '', variant: 'secondary', color: 'text-neutral-500' },
  confirmed: { label: '確認済み', emoji: '', variant: 'default', color: 'text-neutral-400' },
};
