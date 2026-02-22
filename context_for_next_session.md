# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは **2026/02/22 セッション完了時点** でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## 📅 セッション履歴サマリー

### 2026/02/22
- **2/20変更の main 統合**: `claude/restore-lost-code-Dwgkt` ブランチにあった Analytics/Admin 機能を `main` にコミット。
- **ビルドエラー修正**:
  - `analytics.actions.ts` / `profile.actions.ts` に `'use server'` が抜けており `firebase-admin` がクライアントバンドルに混入していた問題を修正。
  - `serializeDoc` を `lib/utils/serialize.ts` に切り出し（`'use server'` ファイルは async 関数のみ export 可のため）。
- **UI修正**: `circles/[circleId]/page.tsx` に幹事向け「👥 メンバー」「📊 アナリティクス」リンクを追加（表示されていなかった）。
- **recharts** (`^2.15.4`) を追加インストール。

### 2026/02/20
本セッションでは **管理者権限（Admin SDK）を利用した高度なアクションと、アナリティクス機能** を実装しました。

- **Admin Actions** (`lib/actions/admin.actions.ts`): サークル作成・メンバー管理・出欠記録・QRチェックインを Admin SDK で一括処理。
- **一括プロフィール更新** (`lib/actions/profile.actions.ts`): ユーザー情報と所属全サークルのメンバー情報を同時更新。
- **アナリティクス** (`lib/actions/analytics.actions.ts`): イベント別出席率・未払いメンバーリスト取得。
- **データ可視化** (`app/(dashboard)/circles/[circleId]/analytics/page.tsx`): Recharts を使った出席率グラフ＋未払いアコーディオン表示。
- **メンバー管理画面** (`app/(dashboard)/circles/[circleId]/members/page.tsx`): メンバー一覧・招待・役職変更・削除。

---

## 📌 現在のプロジェクト状況

### プロジェクト概要
**「結（むすび）」**: 大学サークル等のイベント出欠・集金管理アプリ。幹事の負担ゼロを目指す。
**デプロイURL**: [https://musubi-two.vercel.app/](https://musubi-two.vercel.app/)
**GitHub**: `main` ブランチが最新。restore 系ブランチは統合済みのため不要。
**デザイン**: Notionライクなモノトーンミニマル（白・黒・グレー、細い線、絵文字、広めの余白）。グラフも `#333333` 系で統一。

### 技術スタック
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **Server Actions**: Firebase Admin SDK（サーバー側特権操作）
- **Visualization**: Recharts (`^2.15.4`)
- **Deploy**: Vercel

---

## 🔥 Firebase 設定（重要）

### 環境変数一覧

**クライアント側（`NEXT_PUBLIC_*` — フロントエンドで使用）**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY   ← FCM プッシュ通知に必須
```

**サーバー側（Admin SDK — Vercel の環境変数にも必ず設定すること）**
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY   ← "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" 形式
```

> ⚠️ **Vercel に Admin SDK の3変数が未設定だと、アナリティクス・メンバー管理・QRチェックインなど Admin SDK を使う全機能が動かない。**
> 取得場所: Firebase Console → プロジェクト設定 → サービスアカウント → 「新しい秘密鍵を生成」

### Firebase 初期化ファイル
| ファイル | 役割 |
|---|---|
| `lib/firebase/clientApp.ts` | クライアント側 SDK 初期化 (Auth, Firestore, Messaging) |
| `lib/firebase/adminApp.ts` | サーバー側 Admin SDK 初期化 (`adminDb`, `adminAuth`, `adminMessaging`) |
| `lib/firebase/messaging.ts` | FCM トークン取得・リスニング |

### 使用サービス
- **Authentication**: Google ログインのみ
- **Firestore**: 全データ管理
- **Storage**: プロフィール画像 (`profile_images/{userId}/*`)
- **Cloud Messaging (FCM)**: プッシュ通知（`fcmTokens` 配列で複数デバイス対応）

---

## 🗄️ Firestore コレクション構造

```
users/{uid}
    uid, email, displayName, photoURL, fcmTokens[], faculty?, grade?, createdAt, updatedAt

circles/{circleId}
    id, name, emoji, description, createdBy, createdAt, updatedAt
    └─ members/{uid}
    │       uid, role('organizer'|'member'), joinedAt, displayName, email, photoURL
    └─ events/{eventId}
    │       id, circleId, name, description, date, location, fee, createdBy, createdAt, updatedAt
    │   └─ attendance/{uid|guestId}
    │           id, eventId, circleId, isGuest, uid?, guestId?, attended, checkedInAt, checkedInBy, displayName, email?, photoURL?
    │   └─ payments/{uid|guestId}
    │           id, eventId, circleId, isGuest, uid?, guestId?, amount, status, markedPaidAt?, markedPaidBy?, confirmedAt?, confirmedBy?, createdAt, updatedAt, displayName, email?
    └─ guests/{guestId}
            id, circleId, name, email?, phoneNumber?, notes?, addedBy, addedAt, isActive

notificationLogs/{logId}
    id, circleId, eventId, recipientUid, type, sentAt, sentBy, title, body, success, error?
```

**Collection Group クエリ対応**（`firestore.rules` で許可済み）:
- `collectionGroup('members')` — ユーザーの所属サークル検索
- `collectionGroup('attendance')` — ユーザーの全出席履歴・サークル統計
- `collectionGroup('payments')` — 未払い集計

**支払いステータスの状態機械**:
```
unpaid → pending_confirmation → confirmed
```

---

## 🏗️ ディレクトリ構造と重要ファイル

### Server Actions (`lib/actions/`)

| ファイル | 分類 | 主な関数 |
|---|---|---|
| `admin.actions.ts` | `'use server'` + Admin SDK | `getCurrentUserRoleAdmin`, `addMemberToCircleAdmin`, `promoteToOrganizerAdmin`, `recordAttendanceAdmin`, `qrCheckInAdmin`, `createCircleAdmin` |
| `analytics.actions.ts` | `'use server'` + Admin SDK | `getCircleStatsAdmin`, `getUnpaidMembersAdmin` |
| `profile.actions.ts` | `'use server'` + Admin SDK | `updateUserProfileAdmin`（全サークル一括同期） |
| `circle.actions.ts` | クライアント SDK | `getCircle`, `getCurrentUserRole`, `getCirclesForUser` |
| `event.actions.ts` | クライアント SDK | `createEvent`, `getEventsForCircle` |
| `attendance.actions.ts` | クライアント SDK | 出欠記録・QRチェックイン |
| `payment.actions.ts` | クライアント SDK | 支払い状況管理 |
| `guest.actions.ts` | クライアント SDK | ゲスト追加・管理 |
| `user.actions.ts` | クライアント SDK | プロフィール取得・FCMトークン管理 |

> **ルール**: Admin SDK を使う場合は必ず `'use server'` を先頭に付けること。`serializeDoc` は `lib/utils/serialize.ts` にある（`'use server'` ファイルから export できないため分離）。

### 画面構成 (`app/(dashboard)/`)
- `circles/[circleId]/page.tsx` — サークルトップ（幹事にのみ「メンバー」「ゲスト管理」「アナリティクス」ボタン表示）
- `circles/[circleId]/analytics/page.tsx` — アナリティクス（幹事専用）
- `circles/[circleId]/members/page.tsx` — メンバー管理（幹事専用）
- `circles/[circleId]/events/[eventId]/checkin/page.tsx` — QRチェックイン

### セキュリティルール
- `firestore.rules` — 現状は認証済みユーザーに広めの権限。Admin SDK への段階的移行推奨。
- `storage.rules` — `profile_images/{userId}/*` のみ許可。他は全拒否。

> ⚠️ **これらのルールは Firebase Console からデプロイが必要。** git にあるファイルを変更しても自動反映されない。

---

## 🚀 次のステップ (Next Actions)

1. **Vercel 環境変数の確認** — Admin SDK の3変数 (`FIREBASE_ADMIN_*`) が Vercel に設定されているか確認。未設定ならアナリティクス等が動かない。
2. **Firestore セキュリティルールの強化** — クライアント側からの直接書き込みを制限し、Admin SDK 経由に絞る。
3. **プッシュ通知の実機テスト** — iOS端末でPWAとしてインストールし、通知受信テストを継続。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. **ブランチは main のみ**: 2/22 時点で全変更が `main` に統合済み。restore 系ブランチは無視してよい。
2. **Admin SDK を使う機能はサーバーサイドで権限チェック必須**: `getCurrentUserRoleAdmin` を使い、幹事以外のアクセスは弾くこと。
3. **デザインの維持**: Notion風のミニマルなモノトーンデザインを厳守。グラフ（Recharts）も `#333333` 等のトーンに統一。
4. **`'use server'` の注意**: Admin SDK を使うファイルには必ず `'use server'` を先頭に付ける。sync 関数は export 不可なため、ユーティリティは `lib/utils/` に切り出すこと。
5. **Vercel 環境変数**: 新機能で環境変数を追加した場合は Vercel の Settings → Environment Variables への設定を忘れずに。

**Good Luck! 🍀**
