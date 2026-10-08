共通ルールは ../CLAUDE.md を参照。
DB（共有Supabase）のルールは ../db-schemas/CLAUDE.md を参照。

# slide-app

テーマ（1枚目のタイトル）と中項目を入れると、Claude API で1回の依頼にまとめて Web 検索して要点をまとめ、
あらかじめ用意した背景画像の上に文字を配置した .pptx を作る。作ったスライド案は履歴に残る。
設計は `DESIGN.md` が正典。

- スキーマ: `slideapp` ／ ポート: `3009`
- `ANTHROPIC_API_KEY` を使う（サーバー側のみ。`NEXT_PUBLIC_` を付けない）。
  リサーチ・pptx の API はログイン必須
- モデルは調べる部分が `claude-sonnet-5-5`、箇条書きに整える部分が `claude-haiku-5-5`（API 料金を抑えるため。2026-10-08 に Opus 5.5 から変更）。
  Sonnet は安全判定で断られたとき `fallbacks: "default"` で別モデルに自動で切り替える。Haiku にはこの仕組みが無い
- `src/lib/database.types.ts` は 0103 から手書きした仮の型（Supabase CLI が未導入のため）。
  列を足したらここも直す。CLI を入れたら `supabase gen types typescript --schema slideapp` で置き換える

- テーマカラーはブルー（`DEFAULT_ACCENT_COLOR`）で固定。設定画面に選ぶ項目は置かない（共通ルールの例外。
  `../CLAUDE.md` の「既知の差異」）。`user_settings` 表は残っているが読み書きしない

## データモデルの決定事項

- 中項目ごとの中身（見出し・箇条書き・出典、任意で小項目 `subsections`）は `decks.sections` (jsonb) に持つ。
  中項目単位で検索・集計しないため列に分けない。読むときは `parseSections()` で形を確かめる。
  `subsections` は後から足した項目なので、無い履歴は小項目なしとして扱う
- 出典は `decks.sources` (jsonb) に全体で1つの一覧として持つ（0106 から）。古い履歴は `sections` の中に
  出典があるので、出典を出すときは必ず `allSources()` を通す
- 中項目・小項目の数の上限と本文スライドの合計上限は `src/lib/slides/types.ts` の `MAX_*`（画面とサーバーで共通）
- 背景画像はアプリに同梱した `public/backgrounds/`（素材の番号つき11ファイル）だけを使う。アップロードは
  2026-10-08 に外した。Storage のバケット `slideapp-backgrounds`（0104）は残すが使わない
- 背景画像と文字枠の位置（`config/layout.json`）はアプリ共通。どちらもサーバーで fs から読むので、
  `next.config.ts` の `outputFileTracingIncludes` で Vercel にも同梱している
- 中項目のテンプレートは `templates` 表（`headings` jsonb、中身は `[{heading, subheadings}]`）。名前は本人の中で
  一意で、同じ名前の保存は上書き。読むときは `parseTemplateSections()` で形を確かめる（古い文字列の配列も読む）
- 箇条書きの数・1項目の文字数の上限は `config/layout.json` の `maxBullets` / `maxCharsPerBullet`。
  AI への指示にも同じ値を使う

## 対象外

箇条書きの手直し画面／スライド枚数の自動調整

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
