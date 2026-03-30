'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { X, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/components/auth/AuthProvider';
import {
  getDrinkMenu,
  addDrinkMenuItemAdmin,
  deleteDrinkMenuItemAdmin,
} from '@/lib/actions/drinkMenu.actions';
import type { DrinkMenuItem, DrinkCategory } from '@/lib/types/models';
import { DRINK_CATEGORIES, DRINK_CATEGORY_LABELS } from '@/lib/types/models';

export default function DrinkMenuPage() {
  const params = useParams();
  const circleId = params['circleId'] as string;
  const { user } = useAuthContext();

  const [items, setItems] = useState<DrinkMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<DrinkCategory>('alcohol');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDrinkMenu(circleId);
      setItems(data);
    } catch {
      toast.error('メニューの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((item) => item.category === activeCategory);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || !newPrice) return;

    setAdding(true);
    try {
      await addDrinkMenuItemAdmin(
        circleId,
        { name: newName.trim(), price: parseInt(newPrice, 10), category: activeCategory },
        user.uid
      );
      toast.success(`${newName.trim()} を追加しました`);
      setNewName('');
      setNewPrice('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (item: DrinkMenuItem) => {
    if (!user) return;
    try {
      await deleteDrinkMenuItemAdmin(circleId, item.id, user.uid);
      toast.success(`${item.name} を削除しました`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newName.trim() && newPrice) {
      e.preventDefault();
      handleAdd(e as unknown as React.FormEvent);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">🍹 ドリンクメニュー</h1>

      {/* Category tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {DRINK_CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-foreground text-background'
                  : 'border border-neutral-200 text-muted-foreground hover:bg-neutral-50'
              }`}
            >
              {DRINK_CATEGORY_LABELS[cat]}
              {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Item list */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {DRINK_CATEGORY_LABELS[activeCategory]}のメニューはまだありません
          </p>
        )}

        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-muted-foreground">¥{item.price.toLocaleString()}</span>
              <button
                onClick={() => handleDelete(item)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="例: ビール"
          maxLength={50}
          onKeyDown={handleKeyDown}
          className="flex-1 border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
        />
        <Input
          type="number"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="¥"
          min="1"
          onKeyDown={handleKeyDown}
          className="w-24 border-neutral-200 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim() || !newPrice}
          className="flex shrink-0 items-center gap-1 rounded-md bg-foreground px-3 py-2 text-[12px] font-medium text-background transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          追加
        </button>
      </form>

      <p className="mt-6 text-[11px] text-muted-foreground">
        メニューに登録しておくと、集金ページでワンタップでドリンクを追加できます。
      </p>
    </div>
  );
}
