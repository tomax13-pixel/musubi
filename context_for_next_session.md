# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは **2026/02/24 セッション（全作業完了時点）** でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## 📅 セッション履歴サマリー

### 2026/02/24（本日・最新）

#### ⑪ セキュリティ改善（Admin SDK 移行 + Firestoreルール強化）

全クライアント側書き込みをAdmin SDK（Server Actions）経由に移行し、Firestoreルールでクライアント書き込みを全面禁止。

- `lib/actions/admin.actions.ts` — 支払い系4関数を追加（`getPaymentsForEventAdmin`, `markAsPaidAdmin`, `confirmPaymentAdmin`, `resetPaymentAdmin`）
- 5つの画面ファイルのimportをAdmin SDK版に切り替え：
  - `circles/create/page.tsx` → `createCircleAdmin`
  - `circles/[circleId]/guests/page.tsx` → `addGuestAdmin`, `deactivateGuestAdmin`, `getActiveGuestsAdmin`
  - `events/[eventId]/checkin/page.tsx` → `qrCheckInAdmin`, `getEventAdmin`
  - `events/[eventId]/attendance/page.tsx` → `recordAttendanceAdmin`, `getAttendanceForEventAdmin` 等
  - `events/[eventId]/payments/page.tsx` → `markAsPaidAdmin`, `confirmPaymentAdmin`, `resetPaymentAdmin` 等
- `firestore.rules` — `users/{uid}` 以外の全コレクションで `allow write: if false` に変更。`invites` の読み取りも `if false` に変更
- ⚠️ **Firebase Console からの手動デプロイが必要**

#### ⑩ イベントカレンダー表示

サークル詳細ページのイベント一覧を、テキストリストから月表示カレンダーに変更。

- `components/events/EventCalendar.tsx`（新規）— 月表示カレンダーコンポーネント
  - 前月・次月の切り替え、「今月」ボタン
  - 日曜（赤）土曜（青）の色分け、今日の日付をハイライト
  - イベントがある日にドット（●）表示
  - 日付クリックでその日のイベント詳細を展開
  - `date-fns` の `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek` 等を使用
- `app/(dashboard)/circles/[circleId]/page.tsx` — イベントセクションをカレンダーコンポーネントに差し替え

#### ⑧ 招待リンク機能

サークルの幹事が招待リンク（+QRコード）を生成し、新規メンバーがワンクリックで参加できる機能。

- `lib/types/models.ts` — `CircleInvite` 型を追加
- `lib/actions/invite.actions.ts`（新規）— 招待コード生成・検証・参加の Server Actions
  - `createInviteCode(circleId, uid)` — 6文字の英数字コードを生成（有効期限7日）
  - `getInviteInfo(code)` — コードからサークル情報を取得（未ログインでも可）
  - `joinCircleByInvite(code, uid)` — コードを使ってサークルに参加
- `components/circles/InviteLinkButton.tsx`（新規）— リンクコピー＋QRコード表示ダイアログ
- `app/invite/[code]/page.tsx`（新規）— 招待参加ページ（未ログイン→ログイン→参加のフロー）
- `app/invite/layout.tsx`（新規）— 招待ページ用シンプルレイアウト（サイドバーなし）
- `components/auth/AuthProvider.tsx` — `/invite` パスを公開パスに追加（未ログインでもアクセス可）
- `app/(dashboard)/circles/[circleId]/page.tsx` — 幹事向けに「🔗 招待リンク」ボタンを追加
- `firestore.rules` — `invites` の Collection Group クエリルールを追加
- 依存パッケージ: `qrcode.react`（QRコード生成）

#### ⑨ 日程調整（スケジュール投票）機能

When2meet的な機能。幹事が候補日を提示し、メンバーが ⭕️🔺❌ で回答。集計表で最多⭕️の日がハイライトされる。

- `lib/actions/poll.actions.ts` — 3つの Server Actions を追加
  - `getPollsForCircle(circleId)` — アンケート一覧取得
  - `getPollWithVotes(circleId, pollId)` — 詳細＋全投票結果取得
  - `closePollAdmin(circleId, pollId, uid)` — アンケート締め切り
  - （既存: `createPollAdmin`, `submitPollVoteAdmin`）
- `app/(dashboard)/circles/[circleId]/polls/create/page.tsx`（新規）— アンケート作成ページ
- `app/(dashboard)/circles/[circleId]/polls/[pollId]/page.tsx`（新規）— 集計テーブル＋投票＋締め切り
- `app/(dashboard)/circles/[circleId]/page.tsx` — 「🗳️ 日程調整」セクションを追加
- `firestore.rules` — `polls` / `votes` のルールを追加

### 2026/02/23

コミット `2e044f6` — git push は OneDrive フォルダとの相性問題で失敗中。次回セッション開始時に push が完了しているか確認すること（`git log --oneline -3` でローカルと origin/main のズレを確認）。

#### ⑦ プッシュ通知機能の実装

- `lib/actions/notification.actions.ts`（新規）— 通知送信 Server Action
  - `sendNotificationToAllMembers()` — 全メンバーへ一括送信
  - `sendPaymentReminder()` — 未払いメンバーへ支払いリマインダー
  - `sendAttendanceReminder()` — 未回答メンバーへ出欠リマインダー
  - `notifyEventCreated()` — イベント作成時の自動通知（内部用）
  - `getNotificationLogs()` — 通知ログ取得
- `lib/actions/admin.actions.ts` — `createEventAdmin()` を追加（イベント作成後に自動通知）
- `lib/types/models.ts` — `NotificationLog.type` に `event_created` / `attendance_reminder` を追加
- `components/notifications/SendNotificationPanel.tsx`（新規）— 幹事向け手動送信UIパネル
- `components/layout/Sidebar.tsx` — 🔔「通知をオンにする」ボタンを追加（未許可時のみ表示）
- `components/layout/Header.tsx` — `SheetTitle` を追加（Radix UI アクセシビリティ警告を解消）
- `app/(dashboard)/circles/[circleId]/events/create/page.tsx` — `createEventAdmin()` に差し替え
- `app/(dashboard)/circles/[circleId]/events/[eventId]/page.tsx` — 幹事向け `SendNotificationPanel` を追加
- `public/firebase-messaging-sw.js` — 直接初期化方式に変更、通知タイプ別リンク対応
- `lib/hooks/useNotifications.ts` — 許可済みの場合に起動時にFCMトークンを自動取得・保存する `useEffect` を追加
- `.env.local` — `NEXT_PUBLIC_FIREBASE_VAPID_KEY` を Firebase Console の正しい値に修正
- Vercel 環境変数 — `NEXT_PUBLIC_FIREBASE_VAPID_KEY` を同じ値に更新済み

#### 通知のトラブルシューティング（未解決）

`Registration failed - push service error` が発生する場合:
→ ブラウザの F12 → Application → Service Workers → **Unregister** → Storage → **Clear site data** → リロード
（古い VAPID キーでの push subscription がキャッシュされているため）

### 2026/02/22

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
                                          ※ Firebase Console → プロジェクト設定 → Cloud Messaging
                                          → ウェブプッシュ証明書 の「鍵ペア」の値を使うこと
                                          （古い値 BOF-rZS... は誤り。現在の正しい値 BIRu61h... に修正済み）
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

### プッシュ通知の動作概要

| 通知タイプ | 送信タイミング | 送信先 |
|---|---|---|
| `event_created` | イベント作成時（自動） | 全メンバー |
| `payment_reminder` | 幹事が手動送信 | `status === 'unpaid'` のメンバーのみ |
| `attendance_reminder` | 幹事が手動送信 | 出欠未回答のメンバーのみ |
| カスタムお知らせ | 幹事が手動送信 | 全メンバー |

- FCMトークンは `users/{uid}.fcmTokens[]` に配列で保存（複数デバイス対応）
- `useNotifications` フックが起動時に許可済みなら自動トークン取得・保存
- `notificationLogs/{logId}` に送信ログが蓄積される

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
    │       id, circleId, name, email?, phoneNumber?, notes?, addedBy, addedAt, isActive
    └─ invites/{inviteId}
    │       id, circleId, code(6文字英数字), createdBy, createdAt, expiresAt, isActive
    └─ polls/{pollId}
            id, circleId, title, description?, candidateDates[{id, date, label?}],
            createdBy, createdAt, updatedAt, status('open'|'closed'), deadline?
        └─ votes/{uid}
                uid, pollId, circleId, displayName, photoURL?,
                responses: Record<candidateDateId, 'ok'|'maybe'|'ng'>, votedAt, updatedAt

notificationLogs/{logId}
    id, circleId, eventId?, recipientUid, type, sentAt, sentBy, title, body, success, error?
```

**Collection Group クエリ対応**（`firestore.rules` で許可済み）:
- `collectionGroup('members')` — ユーザーの所属サークル検索、プロフィール一括同期
- `collectionGroup('attendance')` — ユーザーの全出席履歴・サークル統計
- `collectionGroup('payments')` — 未払い集計
- `collectionGroup('invites')` — 招待コード検索（全サークル横断）

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
| `notification.actions.ts` | `'use server'` + Admin SDK | `sendNotificationToAllMembers`, `sendPaymentReminder`, `sendAttendanceReminder`, `notifyEventCreated`, `getNotificationLogs` |
| `admin.actions.ts` | `'use server'` + Admin SDK | `getCurrentUserRoleAdmin`, `searchUserByEmailAdmin`, `addMemberToCircleAdmin`, `promoteToOrganizerAdmin`, `demoteToMemberAdmin`, `removeMemberAdmin`, `recordAttendanceAdmin`, `qrCheckInAdmin`, `createCircleAdmin`, `createEventAdmin`, `getPaymentsForEventAdmin`, `markAsPaidAdmin`, `confirmPaymentAdmin`, `resetPaymentAdmin`, `getEventAdmin`, `getAttendanceForEventAdmin`, `getCircleMembersAdmin`, `addGuestAdmin`, `getActiveGuestsAdmin`, `deactivateGuestAdmin` |
| `analytics.actions.ts` | `'use server'` + Admin SDK | `getCircleStatsAdmin`（月別統計）, `getUnpaidMembersAdmin` |
| `profile.actions.ts` | `'use server'` + Admin SDK | `updateUserProfileAdmin`（displayName + photoURL、全サークル一括同期） |
| `invite.actions.ts` | `'use server'` + Admin SDK | `createInviteCode`, `getInviteInfo`, `joinCircleByInvite` |
| `poll.actions.ts` | `'use server'` + Admin SDK | `createPollAdmin`, `submitPollVoteAdmin`, `getPollsForCircle`, `getPollWithVotes`, `closePollAdmin` |
| `circle.actions.ts` | クライアント SDK（読み取りのみ） | `getCircle`, `getCurrentUserRole`, `getCirclesForUser`, `getCircleMembers` |
| `event.actions.ts` | クライアント SDK（読み取りのみ） | `getEventsForCircle`, `getEvent` |
| `attendance.actions.ts` | クライアント SDK（読み取りのみ） | `getAttendanceForEvent`（型定義 `AttendeeInput` のexportあり） |
| `payment.actions.ts` | クライアント SDK（読み取りのみ） | `getPaymentsForEvent` |
| `guest.actions.ts` | クライアント SDK（読み取りのみ） | `getActiveGuests` |
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
| `circles/InviteLinkButton.tsx` | 招待リンクコピー＋QRコード表示ダイアログ（`qrcode.react` 使用） |
| `circles/MemberCard.tsx` | メンバー表示カード（役職変更・削除ドロップダウン付き） |
| `events/EventCalendar.tsx` | 月表示カレンダー。イベントのある日にドット表示、日付クリックで詳細展開。`date-fns` 使用 |
| `notifications/SendNotificationPanel.tsx` | 幹事向け通知手動送信パネル。支払いリマインダー・出欠リマインダー・全体告知の3種 |
| `ui/avatar.tsx` | Radix UI Avatar ラッパー。`Avatar`, `AvatarImage`, `AvatarFallback` |
| `layout/Sidebar.tsx` | サイドバー（ユーザー情報・ナビゲーション・🔔通知許可ボタン） |
| `layout/Header.tsx` | モバイル用ハンバーガーメニュー。`SheetTitle` 追加済み（アクセシビリティ対応） |
| `auth/AuthProvider.tsx` | Firebase Auth コンテキスト (`useAuthContext()`)。`/invite` パスは公開（未ログインOK） |

### フック (`lib/hooks/`)

| ファイル | 役割 |
|---|---|
| `useNotifications.ts` | 通知許可状態管理。許可済みなら起動時に自動でFCMトークン取得・Firestoreに保存 |

### 画面構成 (`app/(dashboard)/`)

| パス | 説明 | 権限 |
|---|---|---|
| `dashboard/page.tsx` | ダッシュボード（所属サークル一覧） | 全員 |
| `mypage/page.tsx` | マイページ（Avatar・名前・写真変更、学部・学年、KPI、ヒートマップ、デジタル会員証） | 本人 |
| `circles/create/page.tsx` | サークル作成（EmojiPicker 使用） | 全員 |
| `circles/[circleId]/page.tsx` | サークルトップ（**カレンダー形式のイベント一覧**＋日程調整一覧。幹事のみ管理ボタン表示） | 全員 |
| `circles/[circleId]/analytics/page.tsx` | アナリティクス（Recharts グラフ＋未払いアコーディオン） | 幹事専用 |
| `circles/[circleId]/members/page.tsx` | メンバー管理（招待・役職変更・削除） | 幹事専用 |
| `circles/[circleId]/guests/page.tsx` | ゲスト管理 | 幹事専用 |
| `circles/[circleId]/polls/create/page.tsx` | 日程調整アンケート作成（候補日の追加・削除） | 幹事専用 |
| `circles/[circleId]/polls/[pollId]/page.tsx` | 集計テーブル＋⭕️🔺❌投票＋締め切り | 全員（締め切りは幹事） |
| `circles/[circleId]/events/create/page.tsx` | イベント作成（`createEventAdmin` を呼んで作成後に自動通知） | 幹事専用 |
| `circles/[circleId]/events/[eventId]/page.tsx` | イベント詳細（幹事向け `SendNotificationPanel` 表示） | 全員（一部幹事専用） |
| `circles/[circleId]/events/[eventId]/checkin/page.tsx` | QRチェックイン | 幹事専用 |
| `circles/[circleId]/events/[eventId]/attendance/page.tsx` | 出欠確認・集計 | 幹事専用 |
| `circles/[circleId]/events/[eventId]/payments/page.tsx` | 支払い確認・承認 | 幹事専用 |
| `invite/[code]/page.tsx` | 招待リンク参加ページ（未ログイン→ログイン→参加） | 公開 |

### セキュリティルール

| ファイル | 内容 | 注意 |
|---|---|---|
| `firestore.rules` | `users/{uid}` のみ本人書き込み可。他全コレクションはクライアント書き込み禁止（`allow write: if false`）。読み取りは認証済みユーザーに許可。`invites` は読み書き共に `if false`。Collection Group クエリ対応済み | ⚠️ Firebase Console からデプロイ必要 |
| `storage.rules` | `profile_images/{userId}/*` のみ許可。他全拒否 | Firebase Console からデプロイ必要 |

---

## 🚀 次のステップ (Next Actions)

### インフラ・デプロイ関連
1. **git push の完了確認** — `git log --oneline -3` で `origin/main` が最新を指しているか確認。指していなければ `git push origin main` を再実行。
2. **Firestoreに複合インデックスを作成** — ブラウザコンソール（F12）に「The query requires an index」エラーが出た場合、エラーメッセージ内のリンクをクリック → Firebase Console で「インデックスを作成」ボタンを押すだけでOK（数分で有効化される）。
   - 既知の必要インデックス: `notificationLogs` / フィールド1: `circleId`（昇順）/ フィールド2: `sentAt`（降順）
3. **ブラウザのキャッシュクリアと通知テスト** — F12 → Application → Service Workers → Unregister → Storage → Clear site data → リロード → 通知が届くか確認
4. **Firebase Storage ルールのデプロイ** — `storage.rules` を Firebase Console → Storage → ルール に貼り付けてデプロイ。
5. **プッシュ通知の実機テスト** — iOS端末でPWAとしてインストールし、通知受信テストを継続。
6. **Firestore ルールのデプロイ** — `firestore.rules` を Firebase Console → Firestore → ルール に貼り付けて「公開」をクリック。

### ⚠️ 既知のトラブルシューティング
- **`Console AbortError: Registration failed - push service error`** — ブラウザの古いサービスワーカーキャッシュが原因。F12 → Application → Service Workers → Unregister → Clear site data → リロードで解消。アプリの動作には影響なし。
- **`The query requires an index`** — Firestoreクエリに複合インデックスが必要。エラーメッセージ内のリンクをクリックして作成。数分で有効化される。

### ~~🔴 セキュリティ改善（完了✅）~~
6. ~~**Firestore セキュリティルールの強化**~~ — 完了。全書き込みをAdmin SDK経由に移行し、`allow write: if false` に変更済み。
7. ~~**招待コードの権限修正**~~ — 完了。`allow read: if false` に変更済み。
   - ⚠️ **Firebase Console からの手動デプロイがまだの場合、デプロイすること**

### 🟡 機能改善（優先度：中）
8. **一般メンバーの出欠回答機能** — 現状は幹事が手動記録のみ。イベント詳細に「⭕️ 参加 / ❌ 不参加」ボタンを追加し、メンバー自身が回答できるように。
9. **ダッシュボードに「直近のイベント」表示** — 全サークル横断で直近イベントを時系列表示。未回答・未払いのお知らせも。
10. **サークル脱退機能** — メンバーが自分からサークルを抜ける手段がない。
11. **イベント編集・削除機能** — 作成後に日時・場所を修正できない。幹事向け編集・キャンセル機能。
12. **サークル設定変更機能** — サークル名・説明文・絵文字を作成後に変更する手段がない。

### 🟢 あると嬉しい改善（優先度：低）
13. **エラー通知のUI表示** — 現状 `console.error` のみ。`sonner`（導入済み）でトースト表示に。
14. **マイページのコンポーネント分割** — 584行の巨大ファイル。`ProfileHeader`、`KpiCards`、`HeatmapSection` 等に分割。
15. **パンくずリスト / 戻るボタン** — 深い階層からの戻り導線。
16. **日程調整→イベント自動作成** — 最適日決定後ワンクリックでイベント作成画面に遷移、日付自動入力。
17. **PWA対応強化** — `manifest.json` 整備、アプリアイコン、起動画面の設定。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. **ブランチは `main` のみ**: 全変更が統合済み。restore 系ブランチは無視してよい。

2. **Admin SDK を使う機能は権限チェック必須**: 幹事専用機能は `getCurrentUserRoleAdmin(circleId, uid)` で role を確認し、`'organizer'` 以外はエラーを throw すること。

3. **`'use server'` ファイルの制約**:
   - async 関数のみ export 可（sync 関数は `lib/utils/` に切り出す）
   - firebase-admin はサーバー側のみで使用（クライアントに漏れると `child_process` / `fs` エラー）

4. **プロフィール更新は `updateUserProfileAdmin` を使う**: `user.actions.ts` の `updateUserProfile` は `faculty`/`grade` 専用。`displayName`/`photoURL` の変更は必ず Admin SDK 版を使い、全サークル同期を保つこと。

5. **イベント作成は `createEventAdmin` を使う**: `event.actions.ts` の `createEvent` ではなく、`admin.actions.ts` の `createEventAdmin` を使うこと（自動通知が走る）。

6. **デザインの維持**: Notion風ミニマル・モノトーン。新しい UI は既存のスタイル（`border-neutral-200`, `text-[13px]`, `rounded-md` 等）に合わせること。

7. **Vercel 環境変数**: 新機能で環境変数を追加した場合は `.env.local` だけでなく Vercel の Settings → Environment Variables にも追加すること。

8. **Firebase ルール変更時**: `firestore.rules` / `storage.rules` を編集しても git push だけでは本番に反映されない。Firebase Console または `firebase deploy --only firestore:rules,storage` でデプロイすること。

9. **VAPIDキーに注意**: `NEXT_PUBLIC_FIREBASE_VAPID_KEY` は Firebase Console → プロジェクト設定 → Cloud Messaging → ウェブプッシュ証明書 の「鍵ペア」の値を使うこと。`.env.local` と Vercel の両方で一致していることを確認すること。

**Good Luck! 🍀**
