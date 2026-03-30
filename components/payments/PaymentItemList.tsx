'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { addPaymentItemAdmin, removePaymentItemAdmin } from '@/lib/actions/admin.actions';
import { formatAmount } from '@/lib/utils/date';
import { DrinkMenuPicker } from '@/components/payments/DrinkMenuPicker';
import type { PaymentLineItem, DrinkMenuItem } from '@/lib/types/models';

interface PaymentItemListProps {
  circleId: string;
  eventId: string;
  paymentId: string;
  baseFee: number;
  items: PaymentLineItem[];
  canEdit: boolean;
  isOrganizer: boolean;
  currentUserUid: string;
  onItemsChanged: () => void;
  drinkMenu?: DrinkMenuItem[];
}

export function PaymentItemList({
  circleId,
  eventId,
  paymentId,
  baseFee,
  items,
  canEdit,
  isOrganizer,
  currentUserUid,
  onItemsChanged,
  drinkMenu,
}: PaymentItemListProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const priceNum = parseInt(price, 10);
    if (!trimmedName) { toast.error('ドリンク名を入力してください'); return; }
    if (!priceNum || priceNum <= 0) { toast.error('金額を正しく入力してください'); return; }

    setAdding(true);
    try {
      await addPaymentItemAdmin(circleId, eventId, paymentId, { name: trimmedName, price: priceNum }, currentUserUid);
      setName('');
      setPrice('');
      onItemsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await removePaymentItemAdmin(circleId, eventId, paymentId, itemId, currentUserUid);
      onItemsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setRemovingId(null);
    }
  };

  const canRemoveItem = (item: PaymentLineItem) =>
    isOrganizer || item.addedBy === currentUserUid;

  const drinksTotal = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="space-y-2 border-t border-dashed pt-2">
      {/* Base fee */}
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>基本料金</span>
        <span className="tabular-nums">{formatAmount(baseFee)}</span>
      </div>

      {/* Line items */}
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">{item.name}</span>
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-muted-foreground">{formatAmount(item.price)}</span>
            {canEdit && canRemoveItem(item) && (
              <button
                disabled={removingId === item.id}
                onClick={() => handleRemove(item.id)}
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-neutral-100 hover:text-foreground disabled:opacity-40"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Drinks subtotal (when items exist) */}
      {items.length > 0 && (
        <div className="flex items-center justify-between border-t border-dotted pt-1 text-[12px] font-medium">
          <span>合計</span>
          <span className="tabular-nums">{formatAmount(baseFee + drinksTotal)}</span>
        </div>
      )}

      {/* Add form */}
      {canEdit && drinkMenu && drinkMenu.length > 0 ? (
        <div className="pt-1">
          <DrinkMenuPicker
            drinkMenu={drinkMenu}
            disabled={adding}
            onSelect={async (item) => {
              setAdding(true);
              try {
                await addPaymentItemAdmin(circleId, eventId, paymentId, { name: item.name, price: item.price }, currentUserUid);
                toast.success(`${item.name} ¥${item.price.toLocaleString()} を追加`);
                onItemsChanged();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
              } finally {
                setAdding(false);
              }
            }}
          />
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ビール"
            maxLength={50}
            className="h-7 flex-1 rounded border border-neutral-200 px-2 text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="金額"
            min={1}
            className="h-7 w-20 rounded border border-neutral-200 px-2 text-[12px] tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
          <button
            disabled={adding}
            onClick={handleAdd}
            className="flex h-7 items-center gap-0.5 rounded border border-neutral-200 px-2 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            追加
          </button>
        </div>
      ) : null}
    </div>
  );
}
