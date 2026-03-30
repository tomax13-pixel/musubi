'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { DrinkMenuItem, DrinkCategory } from '@/lib/types/models';
import { DRINK_CATEGORIES, DRINK_CATEGORY_LABELS } from '@/lib/types/models';

interface DrinkMenuPickerProps {
  drinkMenu: DrinkMenuItem[];
  onSelect: (item: { name: string; price: number }) => void;
  disabled?: boolean;
}

export function DrinkMenuPicker({ drinkMenu, onSelect, disabled }: DrinkMenuPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DrinkCategory>('alcohol');

  // Custom input state
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const categoriesWithItems = DRINK_CATEGORIES.filter(
    (cat) => drinkMenu.some((item) => item.category === cat)
  );

  const filtered = drinkMenu.filter((item) => item.category === activeCategory);

  const handleSelect = (item: DrinkMenuItem) => {
    onSelect({ name: item.name, price: item.price });
    setOpen(false);
  };

  const handleCustomAdd = () => {
    const name = customName.trim();
    const price = parseInt(customPrice, 10);
    if (!name || !price || price <= 0) return;
    onSelect({ name, price });
    setCustomName('');
    setCustomPrice('');
    setOpen(false);
  };

  // If no category has items yet, default to first available or 'alcohol'
  const effectiveCategory = categoriesWithItems.includes(activeCategory)
    ? activeCategory
    : categoriesWithItems[0] ?? 'alcohol';

  const displayItems = drinkMenu.filter((item) => item.category === effectiveCategory);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-7 items-center gap-0.5 rounded border border-neutral-200 px-2 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
        ドリンクを追加
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">ドリンクを追加</SheetTitle>
            <SheetDescription className="text-[12px]">
              タップして追加
            </SheetDescription>
          </SheetHeader>

          {/* Category pills */}
          {categoriesWithItems.length > 1 && (
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {categoriesWithItems.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    effectiveCategory === cat
                      ? 'bg-foreground text-background'
                      : 'border border-neutral-200 text-muted-foreground hover:bg-neutral-50'
                  }`}
                >
                  {DRINK_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}

          {/* Drink grid */}
          <div className="grid grid-cols-2 gap-2">
            {displayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 p-3 text-center transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <span className="text-[13px] font-medium">{item.name}</span>
                <span className="text-[12px] text-muted-foreground">¥{item.price.toLocaleString()}</span>
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-[12px] text-muted-foreground">メニューにない場合</p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="例: ビール"
                maxLength={50}
                className="h-7 flex-1 rounded border border-neutral-200 px-2 text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="¥"
                min={1}
                className="h-7 w-20 rounded border border-neutral-200 px-2 text-[12px] tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
              <button
                onClick={handleCustomAdd}
                disabled={!customName.trim() || !customPrice}
                className="flex h-7 items-center gap-0.5 rounded border border-neutral-200 px-2 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" strokeWidth={1.5} />
                追加
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
