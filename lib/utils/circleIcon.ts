/**
 * テキスト絵文字をサークルアイコン画像パスに変換するユーティリティ
 * 既存のサークルがFirestoreにテキスト絵文字で保存されているため、
 * 表示時に画像パスへ自動変換する
 */

/** デフォルトのアイコン画像パス（汎用グループアイコン） */
const DEFAULT_ICON = '/assets/circle-icons/default.png';

/** 絵文字 → 画像パスのマッピングテーブル */
const EMOJI_TO_ICON: Record<string, string> = {
  // スポーツ系 → sports.png
  '🎾': '/assets/circle-icons/sports.png',
  '⚽': '/assets/circle-icons/sports.png',
  '🏀': '/assets/circle-icons/sports.png',
  '🏐': '/assets/circle-icons/sports.png',
  '⚾': '/assets/circle-icons/sports.png',
  '🏃': '/assets/circle-icons/sports.png',
  '🚴': '/assets/circle-icons/sports.png',
  '🏊': '/assets/circle-icons/sports.png',
  '⛳': '/assets/circle-icons/sports.png',

  // 音楽系 → music.png
  '🎸': '/assets/circle-icons/music.png',
  '🎵': '/assets/circle-icons/music.png',
  '🎤': '/assets/circle-icons/music.png',

  // 勉強系 → study.png
  '📚': '/assets/circle-icons/study.png',
  '🔬': '/assets/circle-icons/study.png',

  // 読書 → book.png
  '📖': '/assets/circle-icons/book.png',

  // 旅行・アウトドア → travel.png
  '✈️': '/assets/circle-icons/travel.png',
  '🏕️': '/assets/circle-icons/travel.png',
  '🌍': '/assets/circle-icons/travel.png',

  // アート → art.png
  '🎨': '/assets/circle-icons/art.png',

  // カメラ → camera.png
  '📷': '/assets/circle-icons/camera.png',

  // 映画 → movie.png
  '🎬': '/assets/circle-icons/movie.png',

  // ゲーム → game.png
  '🎮': '/assets/circle-icons/game.png',

  // 飲み会 → party.png
  '🍻': '/assets/circle-icons/party.png',

  // 料理・グルメ → cooking.png
  '☕': '/assets/circle-icons/cooking.png',
  '🍔': '/assets/circle-icons/cooking.png',
  '🍰': '/assets/circle-icons/cooking.png',

  // テクノロジー → tech.png
  '💻': '/assets/circle-icons/tech.png',
  '🚀': '/assets/circle-icons/tech.png',

  // ターゲット・目標 → target.png
  '🎯': '/assets/circle-icons/target.png',

  // ペット → pet.png
  '🐶': '/assets/circle-icons/pet.png',
  '🐱': '/assets/circle-icons/pet.png',

  // 自然 → nature.png
  '🌿': '/assets/circle-icons/nature.png',

  // スター → party.png (starの生成ができなかったためpartyで代用)
  '⭐': '/assets/circle-icons/party.png',
};

/**
 * サークルの emoji 値を画像パスに変換する
 * - すでに画像パス（/assets/...）の場合はそのまま返す
 * - テキスト絵文字の場合はマッピングテーブルから画像パスに変換
 * - マッピングにない場合はデフォルトアイコン（汎用グループ）を返す
 */
export function resolveCircleIcon(emoji: string | undefined | null): string {
  if (!emoji) return DEFAULT_ICON;
  if (emoji.startsWith('/assets')) return emoji;
  return EMOJI_TO_ICON[emoji] || DEFAULT_ICON;
}
