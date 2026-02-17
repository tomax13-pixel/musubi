'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const EMOJI_OPTIONS = [
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-transparent text-xl transition-colors hover:bg-accent"
      >
        {value || ''}
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 grid w-[280px] grid-cols-8 gap-0.5 rounded-md border bg-popover p-2 shadow-md">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
