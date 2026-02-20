# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは、**2026/02/20のセッション完了時点**でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## 📅 セッション履歴サマリー

### セッション 1 (2026/02/17): 初期実装

本セッションでは、以下の作業を行い、プロジェクトを**実装完了状態**にしました。

#### 1. 機能実装の完了
- **イベント一覧ページ作成**: `circles/[id]/events` をNotion風デザインで実装。
- **ゲスト管理ページのリファイン**: Shadcn/UIを削除し、モノトーンデザインに統一。
- **PWA対応**: `manifest.json`、SVGアイコン作成、Service Workerの調整。

#### 2. 環境構築と設定
- **Firebase設定**: `.env.local` にClient/Admin SDK、VAPID Keyを全て設定完了。
- **Firestore設定**: セキュリティルールをテストモードに変更し読み書き許可。
- **インデックス作成**: `members` コレクションの `uid` インデックスを作成（コレクション・グループ・クエリ用）。

#### 3. バグ修正
- **ルートページ (404/Default)**: `app/page.tsx` を修正し、認証状態に応じて `/login` か `/dashboard` に自動リダイレクトするように変更。
- **依存関係エラー**: `class-variance-authority` が不足していたためインストール。
- **Undefinedエラー**: 出欠記録時に `guestId`/`uid` が `undefined` になる問題を修正 (`attendance.actions.ts`)。
- **サイドバーリンク切れ (404)**: `/circles` へのリンクを削除し `/dashboard` に統合。

#### 4. 動作確認結果
- ✅ **ログイン**: Google Sign-In 成功、ユーザーデータ作成確認。
- ✅ **サークル作成**: 「テストサークル」作成成功。
- ✅ **イベント作成**: イベント作成と一覧表示確認。
- ✅ **出欠・集金**: メンバーの出欠記録と、支払いレコード（`status: 'unpaid'`）の自動生成を確認。

---

### セッション 2 (2026/02/20): 追加機能実装

#### 1. 追加機能実装
- **デジタル会員証**: マイページにQRコード表示機能を追加（`qrcode.react` を使用）。メンバーデータ `{ type: 'musubi_member', uid: string }` をQRコード化。
- **QRチェックイン**: イベントページに `/checkin` ルートを追加（`jsqr` でカメラスキャン）。リアルタイムカメラフィードとスキャン枠オーバーレイ、チェックイン数と最終結果ステータスを表示。
- **プッシュ通知設定**: マイページに通知許可トグルを追加（`useNotifications` フック）。Firebase Cloud Messaging (FCM) 統合済み。

#### 2. TypeScript修正
- `user.actions.ts` の heatmap型エラーを修正。
- `circle.actions.ts` の serverTimestamp型エラーを修正。
- `CreateCircleDialog` に emoji プロパティを追加。
- マイページのTypeScript型エラーを修正。

#### 3. 動作確認結果
- ✅ **デジタル会員証**: マイページでQRコード表示確認。
- ✅ **QRチェックイン**: カメラスキャンによる出席登録確認。
- ✅ **プッシュ通知設定**: マイページでON/OFF切替確認。

---

## 📌 現在のプロジェクト状況 (Context For Next Session)

### プロジェクト概要
**「結（むすび）」**: 大学サークル等のイベント出欠・集金管理アプリ。幹事の負担ゼロを目指す。
**デザイン**: Notionライクなモノトーンミニマル（白・黒・グレー、細い線、絵文字、広めの余白）。

### 技術スタック
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **Deployment**: Vercel (予定), PWA対応済み

### 主要な依存関係
- `qrcode.react`: QRコード生成（デジタル会員証）
- `jsqr`, `html5-qrcode`: QRコードスキャン（チェックイン）
- `canvas-confetti`, `framer-motion`: アニメーション（マイページ）
- `firebase` / `firebase-admin`: 認証・DB・プッシュ通知

### ディレクトリ構造と重要ファイル

#### アプリルート
- `app/page.tsx`: ルートページ（認証状態に応じて `/login` か `/dashboard` にリダイレクト）
- `app/(auth)/login/page.tsx`: Google Sign-Inページ
- `app/(dashboard)/dashboard/page.tsx`: ホームダッシュボード
- `app/(dashboard)/mypage/page.tsx`: **マイページ**（QRコード会員証、通知設定、ヒートマップ、ランク、支払いサマリー）
- `app/(dashboard)/circles/[circleId]/page.tsx`: サークル詳細
- `app/(dashboard)/circles/[circleId]/events/page.tsx`: イベント一覧
- `app/(dashboard)/circles/[circleId]/events/[eventId]/page.tsx`: イベント詳細
- `app/(dashboard)/circles/[circleId]/events/[eventId]/checkin/page.tsx`: **QRチェックイン**（カメラスキャン）
- `app/(dashboard)/circles/[circleId]/events/[eventId]/attendance/page.tsx`: 出欠記録
- `app/(dashboard)/circles/[circleId]/events/[eventId]/payments/page.tsx`: 集金管理
- `app/(dashboard)/circles/[circleId]/guests/page.tsx`: ゲスト管理

#### APIルート
- `app/api/notifications/send/route.ts`: プッシュ通知送信（幹事のみ）

#### レイアウト・コンポーネント
- `app/layout.tsx`: ルートレイアウト（PWA設定、Auth Provider）
- `components/layout/Sidebar.tsx`: ナビゲーション（`/dashboard` がホーム）

#### Server Actions
- `lib/actions/user.actions.ts`: プロフィール取得・更新、出欠履歴、支払い履歴、ランク・ストリーク計算、ヒートマップデータ、FCMトークン管理
- `lib/actions/circle.actions.ts`: サークル作成・取得、メンバー管理、ユーザーロール取得
- `lib/actions/event.actions.ts`: イベント作成・取得・一覧
- `lib/actions/attendance.actions.ts`: 出欠記録、出欠一覧、**QRチェックイン機能**
- `lib/actions/payment.actions.ts`: 支払い取得・支払い済みマーク・確認・リセット
- `lib/actions/guest.actions.ts`: ゲスト追加・取得・無効化・更新

#### Firebase・フック
- `lib/firebase/clientApp.ts`: Firebase クライアント初期化
- `lib/firebase/adminApp.ts`: Firebase Admin SDK 初期化
- `lib/firebase/messaging.ts`: FCMトークン取得処理
- `lib/hooks/useAuth.ts`: 認証コンテキストフック
- `lib/hooks/useNotifications.ts`: **プッシュ通知許可管理フック**

#### PWAアセット
- `public/manifest.json`: PWAメタデータ
- `public/icon-192.svg`, `public/icon-512.svg`: アプリアイコン
- `public/firebase-messaging-sw.js`: Service Worker（バックグラウンド通知処理）

### 環境変数設定状況
`.env.local` は以下の内容で設定済みです：
- `NEXT_PUBLIC_FIREBASE_*`: Firebase Client設定
- `FIREBASE_ADMIN_*`: Admin SDK設定（Server Actions用）
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: プッシュ通知用

---

## 🚀 次のステップ (Next Actions)

開発は完了し、動作確認もパスしています。次は**運用テストと本番準備**です。

1. **プッシュ通知の実機テスト**
   - デスクトップブラウザでの通知許可と受信テスト
   - iOS端末でPWAとしてインストールし、通知受信テスト

2. **本番環境への移行準備**
   - **Firestoreセキュリティルール**: 現在はテストモード（全許可）です。`firestore_rules_guide.md` を参照して本番用ルールを適用してください。
   - **Vercelデプロイ**: リポジトリをGitHubにプッシュし、Vercelと連携。環境変数をVercelに設定。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. まず `npm run dev` でサーバーを起動してください。
2. `http://localhost:3000` にアクセスすると、自動的に `/login` または `/dashboard` にリダイレクトされます。
3. 全てのタスクは完了済みです。
4. ユーザーからの要望がない限り、既存のコード（特にデザイン）を大きく変更しないでください。「Notion風」の維持が最優先事項です。

**Good Luck! 🍀**
