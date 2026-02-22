# 🔄 プロジェクト完全引き継ぎドキュメント: 結（むすび）

このドキュメントは、**2026/02/20のセッション完了時点**でのプロジェクトの全情報を統合したものです。
新しいAIアシスタントとのセッションを開始する際は、**まずこのファイルを読み込ませてください。**

---

## 📅 セッション履歴サマリー (2026/02/20)

本日のセッションでは、**管理者権限（Admin SDK）を利用した高度なアクションと、アナリティクス機能**を実装しました。

### 1. 新機能の実装 (Admin actions & Analytics)
- **Admin Actions**: `lib/actions/admin.actions.ts` に、Firestoreの制限を回避してバッチ処理を行う管理者用アクションを実装。
  - `serializeDoc`: Timestamp/DateをISO文字列に再帰変換（Client渡し用）。
  - `createCircleAdmin`: サークル作成と幹事登録を一括実行。
  - `recordAttendanceAdmin`: 出欠と支払い記録の一括書き込み。
  - `qrCheckInAdmin`: QRチェックイン時の重複防止と支払い記録自動生成。
- **一括プロフィール更新**: `lib/actions/profile.actions.ts` の `updateProfileBatch` で、ユーザー情報と所属全サークルのメンバー情報を同時更新。
- **アナリティクス**: `lib/actions/analytics.actions.ts` を作成。
  - イベント別出席率計算、未払いメンバーリストの取得機能を実装。
- **データ可視化**: `app/(dashboard)/circles/[circleId]/analytics/page.tsx` および `AttendanceChart.tsx` を作成。
  - Rechartsを使用した出席率グラフ（モノトーンデザイン）を表示。
  - 未払いメンバーをイベントごとにグループ化したアコーディオン形式で表示。

### 2. UI/UXの改善
- **アナリティクスへの導線**: `circles/[circleId]/page.tsx` に、幹事ユーザー限定で「📊 アナリティクス」リンクを表示するように修正。

### 3. ライブラリの追加
- `recharts@^2.15.4` をインストール（グラフ描画用）。

### 4. 重要なブランチ情報
- ⚠️ **最新コードの所在**: 今回の変更（Analytics/Admin機能）は `claude/restore-lost-code-Dwgkt` ブランチにコミットされています。`main` ブランチにマージする際は競合に注意してください。

---

## 📌 現在のプロジェクト状況 (Context For Next Session)

### プロジェクト概要
**「結（むすび）」**: 大学サークル等のイベント出欠・集金管理アプリ。幹事の負担ゼロを目指す。
**デプロイURL**: [https://musubi-two.vercel.app/](https://musubi-two.vercel.app/)
**デザイン**: Notionライクなモノトーンミニマル（白・黒・グレー、細い線、絵文字、広めの余白）。

### 技術スタック
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **Visualization**: Recharts

### ディレクトリ構造と重要ファイル
- `app/layout.tsx`: ルートレイアウト（PWA設定、Auth Provider）
- `app/(dashboard)/circles/[circleId]/analytics/`: アナリティクス画面（幹事専用）
- `lib/actions/`: Server Actions
  - `admin.actions.ts`: Admin SDKを使用した特権操作
  - `analytics.actions.ts`: 統計データ取得
  - `profile.actions.ts`: 一括更新処理

---

## 🚀 次のステップ (Next Actions)

1. **ブランチのマージと本番準備**
   - `claude/restore-lost-code-Dwgkt` の変更内容を評価し、`main` に統合する。
2. **プッシュ通知の実機テスト**
   - iOS端末でPWAとしてインストールし、通知受信テストを継続。
3. **Firestoreセキュリティルール**
   - 管理者用アクション（Admin SDK）を導入したため、クライアントサイドからの直接書き込みを制限する方向でルールの再定義を検討。

---

## 📝 アシスタントへの指示書

「結（むすび）」プロジェクトを引き継ぐアシスタントへ：

1. **最新ブランチの確認**: 開発を続行する前に、`claude/restore-lost-code-Dwgkt` ブランチの状態を確認してください。`main` にはない高度な管理機能が実装されています。
2. **デザインの維持**: 「Notion風」のミニマルなモノトーンデザインを厳守してください。グラフ（Recharts）も `#333333` 等のトーンに統一されています。
3. **権限チェック**: アナリティクスや管理機能は `getCurrentUserRoleAdmin` 等を使用してサーバーサイドで厳密に権限チェックを行っています。変更時はセキュリティを意識してください。

**Good Luck! 🍀**
