import { Badge } from '@/components/ui/badge';
import { PAYMENT_STATUS_CONFIG } from '@/lib/constants/paymentStatus';
import type { PaymentStatus } from '@/lib/types/models';

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className="shrink-0 font-normal">
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </Badge>
  );
}
