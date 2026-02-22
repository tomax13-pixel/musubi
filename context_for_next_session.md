# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは **2026/02/22 セッション（全作業完了時点）** でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## 📅 セッション履歴サマリー

### 2026/02/22（本日・最新）

以下をすべて `main` ブランチにコミット・push 済み。

#### ① 2/20変更の main 統合（commit `3b6c73f`）
`claude/restore-lost-code-Dwgkt` ブランチのみにあった変更を `main` に統合した。
- `lib/actions/admin.actions.ts` — Admin SDK 特権操作
- `lib/actions/analytics.actions.ts` — 出席統計・未払い集計
- `lib/actions/profile.actions.ts` — プロフィール一括更新
- `app/(dashboard)/circles/[circleId]/analytics/page.tsx` — アナリティクス画面
- `app/(dashboard)/circles/[circleId]/members/page.tsx` — メンバー管理画面
- `components/circles/InviteMemberDialog.tsx` / `MemberCard.tsx` — メンバー招待 UI
- `firestore.rules` / `storage.rules` — セキュリティルール

#### ② ビルドエラー修正（commit `b135786`）
- `analytics.actions.ts` / `profile.actions.ts` に `'use server'` が抜けており、`firebase-admin` がクライアントバンドルに混入していた → 追加
- `serializeDoc` は sync 関数のため `'use server'` ファイルから export できない → `lib/utils/serialize.ts` に切り出し
- `recharts` (`^2.15.4`) を `package.json` に追加

#### ③ サークルページの導線追加（commit `1ad2837`）
- `circles/[circleId]/page.tsx` の幹事向けボタン欄に「👥 メンバー」「📊 アナリティクス」リンクを追加（それまで未表示だった）

#### ④ サークル作成ダイアログに絵文字ピッカーを統合（commit `34c68d7`）
- `components/circles/EmojiPicker.tsx` は実装済みだったが `CreateCircleDialog.tsx` に接続されていなかった
- アイコン選択 UI を追加し、選択した絵文字を Firestore に保存するよう修正

#### ⑤ マイページ: 名前・プロフィール写真変更機能（commit `2c575af`）
- `lib/firebase/clientApp.ts` に Firebase Storage (`getStorage`) を初期化・export 追加
- `app/(dashboard)/mypage/page.tsx`:
  - ヘッダーに Avatar コンポーネントを追加（Google 写真 or イニシャル fallback）
  - 編集ダイアログに「名前」入力フィールドを追加
  - 編集ダイアログに「写真を変更」ファイル選択ボタン＋プレビューを追加
  - 保存時に Firebase Storage (`profile_images/{uid}/avatar`) へアップロード
  - `updateUserProfileAdmin` で `displayName` / `photoURL` を更新（全サークルのメンバー情報も自動同期）

#### ⑥ context_for_next_session.md に Firebase 詳細を追記（commit `31ff764`）
Firebase 設定・コレクション構造・環境変数の詳細をドキュメントに追記。

### 2026/02/20
**管理者権限（Admin SDK）を利用した高度なアクションと、アナリティクス機能** を実装（→ 2/22 に main 統合）。
- Admin SDK Server Actions 全般
- Recharts を使ったアナリティクス画面
- メンバー管理画面

---

## 📌 現在のプロジェクト状況

### プロジェクト概要
**「結（むすび）」**: 大学サークル等のイベント出欠・集金管理アプリ。幹事の負担ゼロを目指す。
**デプロイURL**: [https://musubi-two.vercel.app/](https://musubi-two.vercel.app/)
**GitHub**: `main` ブランチが最新（restore 系ブランチは統合済みにつき不要）。
**デザイン**: Notionライクなモノトーンミニマル（白・黒・グレー、細い線、絵文字、広めの余白）。グラフも `#333333` 系に統一。

### 技術スタック
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **Server Actions**: Firebase Admin SDK（サーバー側特権操作）
- **Visualization**: Recharts (`^2.15.4`)
- **Deploy**: Vercel（GitHub push で自動デプロイ）

---

## 🔥 Firebase 設定（重要）

### 環境変数一覧

**クライアント側（`NEXT_PUBLIC_*`）**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    ← Storage に必須
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY         ← FCM プッシュ通知に必須
```

**サーバー側（Admin SDK — `.env.local` と Vercel 両方に設定すること）**
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY   ← "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" 形式
```

> ⚠️ **Vercel に Admin SDK の3変数が未設定だと、アナリティクス・メンバー管理・QRチェックイン等 Admin SDK を使う全機能が動かない。**
> 取得場所: Firebase Console → プロジェクト設定 → サービスアカウント → 「新しい秘密鍵を生成」

### Firebase 初期化ファイル

| ファイル | 役割 | export するもの |
|---|---|---|
| `lib/firebase/clientApp.ts` | クライアント側 SDK 初期化 | `auth`, `db`, `storage`, `googleProvider` |
| `lib/firebase/adminApp.ts` | サーバー側 Admin SDK 初期化 | `adminDb`, `adminAuth`, `adminMessaging` |
| `lib/firebase/messaging.ts` | FCM トークン取得・リスニング | — |

### 使用サービスと用途

| サービス | 用途 |
|---|---|
| **Authentication** | Google ログインのみ |
| **Firestore** | 全データ管理 |
| **Storage** | プロフィール写真 `profile_images/{uid}/avatar` |
| **Cloud Messaging** | プッシュ通知（`fcmTokens[]` で複数デバイス対応） |

> ⚠️ **`storage.rules` / `firestore.rules` は Firebase Console からデプロイが必要。** git の変更だけでは本番に反映されない。

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
    │           id, eventId, circleId, isGuest, uid?, guestId?, attended,
    │           checkedInAt, checkedInBy, displayName, email?, photoURL?
    │   └─ payments/{uid|guestId}
    │           id, eventId, circleId, isGuest, uid?, guestId?, amount,
    │           status('unpaid'|'pending_confirmation'|'confirmed'),
    │           markedPaidAt?, markedPaidBy?, confirmedAt?, confirmedBy?,
    │           createdAt, updatedAt, displayName, email?
    └─ guests/{guestId}
            id, circleId, name, email?, phoneNumber?, notes?, addedBy, addedAt, isActive

notificationLogs/{logId}
    id, circleId, eventId, recipientUid, type, sentAt, sentBy, title, body, success, error?
```

**Collection Group クエリ対応**（`firestore.rules` で許可済み）:
- `collectionGroup('members')` — ユーザーの所属サークル検索、プロフィール一括同期
- `collectionGroup('attendance')` — ユーザーの全出席履歴・サークル統計
- `collectionGroup('payments')` — 未払い集計

**支払いステータスの状態機械**:
```
unpaid → pending_confirmation → confirmed
```

**プロフィール更新の波及**:
`updateUserProfileAdmin(uid, { displayName, photoURL })` を呼ぶと、
`users/{uid}` と 所属する全 `circles/*/members/{uid}` が Admin SDK のバッチで一括更新される。

---

## 🏗️ ディレクトリ構造と重要ファイル

### Server Actions (`lib/actions/`)

| ファイル | 分類 | 主な関数 |
|---|---|---|
| `admin.actions.ts` | `'use server'` + Admin SDK | `getCurrentUserRoleAdmin`, `searchUserByEmailAdmin`, `addMemberToCircleAdmin`, `promoteToOrganizerAdmin`, `demoteToMemberAdmin`, `removeMemberAdmin`, `recordAttendanceAdmin`, `qrCheckInAdmin`, `createCircleAdmin` |
| `analytics.actions.ts` | `'use server'` + Admin SDK | `getCircleStatsAdmin`（月別統計）, `getUnpaidMembersAdmin` |
| `profile.actions.ts` | `'use server'` + Admin SDK | `updateUserProfileAdmin`（displayName + photoURL、全サークル一括同期） |
| `circle.actions.ts` | クライアント SDK | `getCircle`, `getCurrentUserRole`, `getCirclesForUser`, `createCircle` |
| `event.actions.ts` | クライアント SDK | `createEvent`, `getEventsForCircle`, `getEvent` |
| `attendance.actions.ts` | クライアント SDK | 出欠記録・QRチェックイン |
| `payment.actions.ts` | クライアント SDK | 支払い状況管理（mark/confirm） |
| `guest.actions.ts` | クライアント SDK | ゲスト追加・管理 |
| `user.actions.ts` | クライアント SDK | `getUserProfile`, `updateUserProfile`（faculty/grade）, FCMトークン管理, 出席履歴, ヒートマップ |

> **重要ルール**: Admin SDK を使うファイルには必ず `'use server'` を先頭に付けること。
> `serializeDoc`（sync関数）は `lib/utils/serialize.ts` に切り出されている（`'use server'` ファイルは async 関数のみ export 可）。

### ユーティリティ (`lib/utils/`)

| ファイル | 役割 |
|---|---|
| `serialize.ts` | `serializeDoc<T>()` — Firestore Timestamp → ISO文字列変換。Admin SDK の戻り値を Client に渡す前に必ず使う |
| `date.ts` | `formatDate()`, `formatAmount()` — 日付・金額フォーマット |

### コンポーネント (`components/`)

| ファイル | 役割 |
|---|---|
| `circles/EmojiPicker.tsx` | 32種の絵文字から選択できるポップアップピッカー。`value` / `onChange` props |
| `circles/CreateCircleDialog.tsx` | サークル作成ダイアログ。EmojiPicker 統合済み。デフォルト絵文字 `🎯` |
| `circles/InviteMemberDialog.tsx` | メンバー招待ダイアログ（メール入力 → `addMemberToCircleAdmin`） |
| `circles/MemberCard.tsx` | メンバー表示カード（役職変更・削除ドロップダウン付き） |
| `ui/avatar.tsx` | Radix UI Avatar ラッパー。`Avatar`, `AvatarImage`, `AvatarFallback` |
| `layout/Sidebar.tsx` | サイドバー（ユーザー情報・ナビゲーション） |
| `auth/AuthProvider.tsx` | Firebase Auth コンテキスト (`useAuthContext()`) |

### 画面構成 (`app/(dashboard)/`)

| パス | 説明 | 権限 |
|---|---|---|
| `dashboard/page.tsx` | ダッシュボード（所属サークル一覧） | 全員 |
| `mypage/page.tsx` | マイページ（Avatar・名前・写真変更、学部・学年、KPI、ヒートマップ、デジタル会員証） | 本人 |
| `circles/create/page.tsx` | サークル作成（EmojiPicker 使用） | 全員 |
| `circles/[circleId]/page.tsx` | サークルトップ（幹事のみ「メンバー」「ゲスト管理」「アナリティクス」ボタン表示） | 全員 |
| `circles/[circleId]/analytics/page.tsx` | アナリティクス（Recharts グラフ＋未払いアコーディオン） | 幹事専用 |
| `circles/[circleId]/members/page.tsx` | メンバー管理（招待・役職変更・削除） | 幹事専用 |
| `circles/[circleId]/guests/page.tsx` | ゲスト管理 | 幹事専用 |
| `circles/[circleId]/events/[eventId]/checkin/page.tsx` | QRチェックイン | 幹事専用 |
| `circles/[circleId]/events/[eventId]/attendance/page.tsx` | 出欠確認・集計 | 幹事専用 |
| `circles/[circleId]/events/[eventId]/payments/page.tsx` | 支払い確認・承認 | 幹事専用 |

### セキュリティルール

| ファイル | 内容 | 注意 |
|---|---|---|
| `firestore.rules` | 認証済みユーザーに広めの権限（暫定）。Collection Group クエリ対応済み | Firebase Console からデプロイ必要 |
| `storage.rules` | `profile_images/{userId}/*` のみ許可。他全拒否 | Firebase Console からデプロイ必要 |

---

## 🚀 次のステップ (Next Actions)

1. **Vercel 環境変数の確認** — Admin SDK の3変数 (`FIREBASE_ADMIN_*`) が Vercel に設定されているか確認。未設定ならアナリティクス等が動かない。
2. **Firebase Storage ルールのデプロイ** — `storage.rules` を Firebase Console → Storage → ルール に貼り付けてデプロイ（プロフィール写真アップロードに必要）。
3. **Firestore セキュリティルールの強化** — 現状は認証済みユーザー全員に書き込み権限。Admin SDK 経由に絞る方向で再定義を検討。
4. **プッシュ通知の実機テスト** — iOS端末でPWAとしてインストールし、通知受信テストを継続。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. **ブランチは `main` のみ**: 全変更が統合済み。restore 系ブランチは無視してよい。

2. **Admin SDK を使う機能は権限チェック必須**: 幹事専用機能は `getCurrentUserRoleAdmin(circleId, uid)` で role を確認し、`'organizer'` 以外はエラーを throw すること。

3. **`'use server'` ファイルの制約**:
   - async 関数のみ export 可（sync 関数は `lib/utils/` に切り出す）
   - firebase-admin はサーバー側のみで使用（クライアントに漏れると `child_process` / `fs` エラー）

4. **プロフィール更新は `updateUserProfileAdmin` を使う**: `user.actions.ts` の `updateUserProfile` は `faculty`/`grade` 専用。`displayName`/`photoURL` の変更は必ず Admin SDK 版を使い、全サークル同期を保つこと。

5. **デザインの維持**: Notion風ミニマル・モノトーン。新しい UI は既存のスタイル（`border-neutral-200`, `text-[13px]`, `rounded-md` 等）に合わせること。

6. **Vercel 環境変数**: 新機能で環境変数を追加した場合は `.env.local` だけでなく Vercel の Settings → Environment Variables にも追加すること。

7. **Firebase ルール変更時**: `firestore.rules` / `storage.rules` を編集しても git push だけでは本番に反映されない。Firebase Console または `firebase deploy --only firestore:rules,storage` でデプロイすること。

**Good Luck! 🍀**
