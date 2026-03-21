'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const EMOJI_OPTIONS = [
  '\u{1F3BE}', '\u{26BD}', '\u{1F3C0}', '\u{1F3D0}', '\u{26BE}', '\u{1F3B8}', '\u{1F3B5}', '\u{1F3A4}',
  '\u{1F4DA}', '\u{1F4D6}', '\u{2708}\uFE0F', '\u{1F3D5}\uFE0F', '\u{1F3A8}', '\u{1F4F7}', '\u{1F3AC}', '\u{1F3AE}',
  '\u{2615}', '\u{1F37B}', '\u{1F354}', '\u{1F370}', '\u{1F3C3}', '\u{1F6B4}', '\u{1F3CA}', '\u{26F3}',
  '\u{1F4BB}', '\u{1F52C}', '\u{1F30D}', '\u{2B50}', '\u{1F680}', '\u{1F33F}', '\u{1F436}', '\u{1F431}',
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
          {EMOJI_OPTIONS.map((emoji, index) => (
            <button
              key={index}
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
