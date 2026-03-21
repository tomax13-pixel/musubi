import React from 'react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CircleIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

const AVAILABLE_ICONS = [
  { id: 'sports', path: '/assets/circle-icons/sports.png', label: 'スポーツ' },
  { id: 'music', path: '/assets/circle-icons/music.png', label: '音楽' },
  { id: 'study', path: '/assets/circle-icons/study.png', label: '勉強・ゼミ' },
  { id: 'party', path: '/assets/circle-icons/party.png', label: '飲み会・イベント' },
  { id: 'game', path: '/assets/circle-icons/game.png', label: 'ゲーム' },
  { id: 'camera', path: '/assets/circle-icons/camera.png', label: '写真・カメラ' },
  { id: 'cooking', path: '/assets/circle-icons/cooking.png', label: '料理' },
  { id: 'art', path: '/assets/circle-icons/art.png', label: 'アート' },
  { id: 'movie', path: '/assets/circle-icons/movie.png', label: '映画' },
  { id: 'tech', path: '/assets/circle-icons/tech.png', label: 'テクノロジー' },
  { id: 'travel', path: '/assets/circle-icons/travel.png', label: '旅行' },
  { id: 'language', path: '/assets/circle-icons/language.png', label: '語学' },
  { id: 'book', path: '/assets/circle-icons/book.png', label: '読書' },
  { id: 'business', path: '/assets/circle-icons/business.png', label: 'ビジネス' },
  { id: 'target', path: '/assets/circle-icons/target.png', label: 'ターゲット' },
  { id: 'pet', path: '/assets/circle-icons/pet.png', label: 'ペット' },
  { id: 'nature', path: '/assets/circle-icons/nature.png', label: '自然' },
  { id: 'default', path: '/assets/circle-icons/default.png', label: 'その他' },
];

export function CircleIconPicker({ value, onChange, children }: CircleIconPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 text-[12px] font-medium text-muted-foreground">アイコンを選択</div>
        <div className="grid grid-cols-4 gap-2">
          {AVAILABLE_ICONS.map((icon) => (
            <button
              key={icon.id}
              onClick={() => {
                onChange(icon.path);
                setOpen(false);
              }}
              className={`relative flex aspect-square items-center justify-center rounded-xl border-2 transition-all hover:scale-105 ${
                value === icon.path ? 'border-foreground shadow-sm' : 'border-transparent hover:bg-neutral-50'
              }`}
              title={icon.label}
            >
              <Image
                src={icon.path}
                alt={icon.label}
                fill
                className="object-contain p-1.5"
                sizes="40px"
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
