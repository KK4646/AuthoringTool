共通ルールは ../CLAUDE.md を参照。
DB（共有Supabase）のルールは ../db-schemas/CLAUDE.md を参照。

# slide-app

テーマ（1枚目のタイトル）と中項目を入れると、中項目ごとに Claude API で Web 検索して要点をまとめ、
あらかじめ用意した背景画像の上に文字を配置した .pptx を作る。作ったスライド案は履歴に残る。
設計は `DESIGN.md` が正典。

- スキーマ: `slideapp` ／ ポート: `3009`
- `ANTHROPIC_API_KEY` を使う（サーバー側のみ。`NEXT_PUBLIC_` を付けない）。
  リサーチ・pptx の API はログイン必須
- モデルは `claude-opus-5-5`。安全判定で断られたときは `fallbacks: "default"` で別モデルに自動で切り替える
- `src/lib/database.types.ts` は 0103 から手書きした仮の型（Supabase CLI が未導入のため）。
  列を足したらここも直す。CLI を入れたら `supabase gen types typescript --schema slideapp` で置き換える

- テーマカラーはブルー（`DEFAULT_ACCENT_COLOR`）で固定。設定画面に選ぶ項目は置かない（共通ルールの例外。
  `../CLAUDE.md` の「既知の差異」）。`user_settings` 表は残っているが読み書きしない

## データモデルの決定事項

- 中項目ごとの中身（見出し・箇条書き・出典）は `decks.sections` (jsonb) に持つ。
  中項目単位で検索・集計しないため列に分けない。読むときは `parseSections()` で形を確かめる
- 背景画像は設定画面でアップロードしたもの（Storage の `slideapp-backgrounds`、キーは `<user_id>/title` と
  `<user_id>/content`）を優先し、無ければ既定の `public/backgrounds/` を使う。表には持たない
- 既定の背景画像と文字枠の位置（`config/layout.json`）はアプリ共通。どちらもサーバーで fs から読むので、
  `next.config.ts` の `outputFileTracingIncludes` で Vercel にも同梱している
- 箇条書きの数・1項目の文字数の上限は `config/layout.json` の `maxBullets` / `maxCharsPerBullet`。
  AI への指示にも同じ値を使う

## 対象外

箇条書きの手直し画面／スライド枚数の自動調整

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
