import { format, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function formatDate(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'yyyy年M月d日(E)', { locale: ja });
}

export function formatDateTime(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'yyyy年M月d日(E) HH:mm', { locale: ja });
}

export function formatRelative(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: ja });
}

export function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}
