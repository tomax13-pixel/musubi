import Image from 'next/image';
import { resolveCircleIcon } from '@/lib/utils/circleIcon';

interface CircleIconProps {
  emoji: string | undefined | null;
  size?: number;
  className?: string;
}

/**
 * サークルのアイコンを表示する共通コンポーネント
 * テキスト絵文字でも画像パスでも、常に画像として表示する
 */
export function CircleIcon({ emoji, size = 24, className = '' }: CircleIconProps) {
  const iconPath = resolveCircleIcon(emoji);

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconPath}
        alt="サークルアイコン"
        fill
        className="object-contain"
        sizes={`${size}px`}
      />
    </div>
  );
}
