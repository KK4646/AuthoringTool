# slide-app DESIGN

## 概要

発表用スライドの下書きを作るアプリ。テーマ（1枚目のスライドタイトル）と中項目を入れると、
中項目ごとに Web 検索して要点を箇条書きにまとめ、あらかじめ用意した背景画像の上に
決めておいた位置で文字を置いた .pptx を作る。本人のみ利用。

- スライドの構成: 表紙 → 目次 → 中項目ごとに1枚 → 出典（12件ごとに1枚）
- 作ったスライド案は履歴に残り、あとから開き直して再ダウンロードできる
- もとは `~/Documents/学校/Python基礎/slide-app` で作った試作。2026-10-08 にモノレポへ移した

## 技術構成

共通スタックどおり（`../CLAUDE.md`）。追加の依存は次の3つ（2026-10-08 ユーザー承認）。

| 依存 | 用途 |
|---|---|
| `@anthropic-ai/sdk` | Claude API（Web 検索・要約） |
| `pptxgenjs` | .pptx の組み立て |
| `zod` | 入力・AI の出力・DB の jsonb の形の確認 |

- スキーマ名: `slideapp`／ポート: `3009`（3008 は my-apps 外の Youtube_Cutout が固定で使っているため）
- 環境変数: 共通の2つ＋ `ANTHROPIC_API_KEY`（サーバー側のみ）
- リサーチの流れ（`src/lib/slides/research.ts`）
  1. 中項目ごとに並行して、Web 検索ツール付きで Claude に調べさせ、メモと引用元 URL を得る
  2. メモを、`config/layout.json` の上限（項目数・文字数）に収まる箇条書きに整える（構造化出力）
- モデル: `claude-opus-5-5`（effort `medium`）。`fallbacks: "default"` で断られたときに自動で切り替える
- pptx（`src/lib/slides/pptx.ts`）: 16:9（13.333×7.5 インチ）。背景画像は `public/backgrounds/`、
  文字枠は `config/layout.json`。画像が無いときは `backgroundColor` で塗る
- API（どちらもログイン必須）
  - `POST /api/research` … リサーチして `decks` に保存し、`{ deck, id }` を返す。保存に失敗しても内容は返す
  - `POST /api/pptx` … スライド内容（JSON）を受け取り .pptx を返す。DB は読まない

## データベース設計

全テーブル RLS で「`user_id = auth.uid()` の行だけ読み書き可」。マイグレーションは `0103_slideapp_schema.sql`。

### decks（作ったスライド案）

| 列 | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | `default auth.uid()` |
| title | text | 1枚目のタイトル（必須・空白のみ不可） |
| subtitle | text | 表紙のサブタイトル（無ければ空文字） |
| sections | jsonb | `[{"heading", "bullets": [...], "sources": [{"title", "url"}]}]`（配列のみ可） |
| created_at / updated_at | timestamptz | |

中項目の中身は列に分けない。中項目単位で検索・集計することがなく、形も単純なため。

### user_settings（テーマ色）

| 列 | 型 | 説明 |
|---|---|---|
| user_id | uuid PK | |
| accent_color | text | 8色パレットのどれか |
| updated_at | timestamptz | |

## 実装ロードマップ

1. ✅ 作成画面（タイトル必須・中項目の追加と取り除き）→ リサーチ → 詳細画面でダウンロード
2. ✅ 履歴の一覧・詳細・削除（「編集」の奥に削除、確認ダイアログあり）
3. ✅ 設定（テーマ色・ログアウト）
4. 背景画像を本番用に差し替え、`config/layout.json` の位置を合わせる（ユーザー作業）
5. Vercel に公開（Root Directory = `slide-app`）

## MVP対象外(実装しない)

- 箇条書きを画面で手直しする機能
- 背景画像をユーザーごとにアップロードする機能
- 枠からあふれる文字の自動縮小（PowerPoint の自動調整と、AI への文字数制限に任せる）
- スライドの共有・公開
