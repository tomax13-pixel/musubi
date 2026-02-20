# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは、**2026/02/20のセッション完了時点**でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## ⚠️ 絶対に守るべき開発の「掟」

1. **デザイン原則**: Notionライクなモノトーン（白・黒・グレー、細いボーダー）。カラフルな色は禁止。
2. **データアクセス原則**: データの更新・書き込みは必ず **Admin SDK (Server Actions)** を使用すること。Client SDKによる直接更新は禁止。
3. **シリアライズ徹底**: Timestamp型は必ず `.toDate().toISOString()` で文字列化してクライアントに渡すこと。

---

## 📅 セッション履歴サマリー

### 2026/02/17

- **イベント一覧ページ**: `circles/[id]/events` をNotion風デザインで実装。
- **ゲスト管理ページのリファイン**: Shadcn/UIを削除し、モノトーンデザインに統一。
- **PWA対応**: `manifest.json`、SVGアイコン作成、Service Worker調整。
- **Firebase設定**: `.env.local` にClient/Admin SDK、VAPID Keyを全て設定完了。
- **Firestore設定**: セキュリティルールをテストモードに変更（読み書き許可）。
- **ルートページ修正**: `app/page.tsx` を認証状態に応じて `/login` か `/dashboard` に自動リダイレクトするよう修正。
- **動作確認完了**: ログイン・サークル作成・イベント作成・出欠記録・支払い自動生成を全て確認。

### 2026/02/20

- **Admin SDK Server Actions の実装** (`lib/actions/admin.actions.ts`):
  - サークル管理: `createCircleAdmin`, `updateCircleAdmin`
  - メンバー管理: `addMemberAdmin`, `removeMemberAdmin`, `updateMemberRoleAdmin`
  - 出欠一括記録: `recordAttendanceAdmin`（バッチ書き込み、支払いレコード自動生成）
  - QRチェックイン: `qrCheckInAdmin`（Admin SDK版、権限エラー解消済み）
  - シリアライズ: `serializeTimestamp`, `serializeDoc`
- **プッシュ通知 API** (`app/api/notifications/send/route.ts`): FCMマルチキャスト送信、無効トークン自動削除、ログ記録。
- **プロフィールバッチ更新** (`lib/actions/profile.actions.ts`): `users/{uid}` と全所属サークルの `members/{uid}` を1バッチで同期更新する `updateProfileBatch`。
- **アナリティクス集計** (`lib/actions/analytics.actions.ts`): Recharts用に `getCircleAnalytics`（イベント別出席率・未払いメンバー一覧、全フィールドシリアライズ済み）。
- **アナリティクスページ** (`app/(dashboard)/circles/[circleId]/analytics/page.tsx`): Rechartsのモノトーン棒グラフ（#333333）・未払いテーブル・サマリーカード。
- **recharts@3.7.0 インストール済み**。

---

## 📌 現在のプロジェクト状況

### プロジェクト概要
**「結（むすび）」**: 大学サークル等のイベント出欠・集金管理アプリ。幹事の負担ゼロを目指す。
**デザイン**: Notionライクなモノトーンミニマル（白・黒・グレー、細い線、絵文字、広めの余白）。

### 技術スタック
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **グラフ**: Recharts 3.7.0
- **Deployment**: Vercel（予定）, PWA対応済み

---

## 📁 ディレクトリ構造と重要ファイル

### Firebase設定 (`lib/firebase/`)
| ファイル | 用途 |
|---------|------|
| `clientApp.ts` | Client SDK（Auth, Firestore）— `'use client'` |
| `adminApp.ts` | Admin SDK（Server Actions専用） |
| `messaging.ts` | FCM初期化・トークン取得 |

### Server Actions (`lib/actions/`)
| ファイル | 主要関数 | 備考 |
|---------|---------|------|
| `circle.actions.ts` | `createCircle`, `getCircle`, `getCircleMembers`, `getCurrentUserRole` | Client SDK |
| `event.actions.ts` | `createEvent`, `getEvent`, `getEventsForCircle`, `updateEvent` | Client SDK |
| `attendance.actions.ts` | `recordAttendance`, `getAttendanceForEvent`, `qrCheckIn` | Client SDK |
| `guest.actions.ts` | `addGuest`, `getActiveGuests`, `deactivateGuest`, `updateGuest` | Client SDK |
| `payment.actions.ts` | `getPaymentsForEvent`, `markAsPaid`, `confirmPayment`, `resetPayment` | Client SDK |
| `user.actions.ts` | `getUserProfile`, `updateUserProfile`, `saveFCMToken`, `calculateRank`, `getHeatmapData` | Client SDK |
| **`admin.actions.ts`** | `createCircleAdmin`, `addMemberAdmin`, `removeMemberAdmin`, `recordAttendanceAdmin`, `qrCheckInAdmin`, `serializeTimestamp`, `serializeDoc` | **Admin SDK** ✅ |
| **`profile.actions.ts`** | `updateProfileBatch` | **Admin SDK** ✅ |
| **`analytics.actions.ts`** | `getCircleAnalytics` | **Admin SDK** ✅ |

### ページ構造 (`app/`)
```
app/
├── page.tsx                              # ルート → /login or /dashboard 自動リダイレクト
├── (auth)/login/page.tsx                 # Googleログインページ
├── api/notifications/send/route.ts       # FCMプッシュ通知 API
└── (dashboard)/
    ├── layout.tsx                        # サイドバー付きレイアウト
    ├── dashboard/page.tsx                # ホーム（所属サークル一覧）
    ├── mypage/page.tsx                   # マイページ（プロフィール・ランク・ヒートマップ）
    └── circles/
        ├── create/page.tsx               # サークル作成
        └── [circleId]/
            ├── page.tsx                  # サークル詳細（イベント一覧・アナリティクスリンク付き）
            ├── analytics/page.tsx        # アナリティクス（Recharts棒グラフ・未払いテーブル）
            ├── guests/page.tsx           # ゲスト管理
            └── events/
                ├── page.tsx             # イベント一覧（Notion風）
                ├── create/page.tsx      # イベント作成
                └── [eventId]/
                    ├── page.tsx         # イベント詳細
                    ├── checkin/page.tsx # QRカメラチェックイン（jsqr）
                    ├── attendance/page.tsx # 出欠一覧・記録
                    └── payments/page.tsx   # 支払い管理
```

### Firestore コレクション構造
```
users/{uid}
circles/{circleId}
  └── members/{uid}
  └── events/{eventId}
      └── attendance/{uid|guestId}
      └── payments/{uid|guestId}
  └── guests/{guestId}
notificationLogs/{logId}
```

---

## 🔑 環境変数 (`.env.local`)

```
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=     # FCMプッシュ通知用

# Firebase Admin SDK（Server Actions用）
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

---

## 🚀 次のステップ

1. **プッシュ通知の実機テスト**
   - デスクトップブラウザでの通知許可と受信テスト
   - iOS端末でPWAとしてインストールし、通知受信テスト

2. **本番環境への移行準備**
   - **Firestoreセキュリティルール**: 現在はテストモード（全許可）。`firestore_rules_guide.md` を参照して本番用ルールを適用。
   - **Vercelデプロイ**: リポジトリをGitHubにプッシュし、Vercelと連携。環境変数をVercelに設定。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. まず `npm run dev` でサーバーを起動してください。
2. `http://localhost:3000` にアクセスすると、自動的に `/login` または `/dashboard` にリダイレクトされます。
3. 全タスクは完了済みです。
4. **ユーザーからの要望がない限り、既存のコード（特にデザイン）を大きく変更しないでください。「Notion風モノトーン」の維持が最優先事項です。**
5. **新しいデータ書き込み処理を追加する場合は、必ず `'use server'` + Admin SDK を使用してください。**

**Good Luck! 🍀**
