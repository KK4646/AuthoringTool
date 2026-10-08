# slide-app

テーマと中項目から Web 検索して、背景画像に合わせた .pptx を作る。

```
cp .env.example .env.local   # 値を入れる（ANTHROPIC_API_KEY も）
npm install
npm run dev                  # http://localhost:3009
npm test
```

## 背景画像の差し替え

設定画面の「背景画像」からアップロードできる（16:9 の PNG / JPEG、5MB まで、例 1920×1080）。
表紙用と、目次・本文・出典の共通用の2枚。アップロードしていない枠は、次の既定の画像を使う。

既定の画像は `public/backgrounds/` に置く。`title.png` が表紙、`content.png` が目次・本文・出典。
今の2枚は `node scripts/make-sample-backgrounds.mjs` で作った仮画像（同名で上書きすれば差し替わる）。
画像が無いときは `config/layout.json` の `backgroundColor` で塗る。

## 文字の位置・色・大きさ（`config/layout.json`）

単位はインチ。スライド全体は **幅 13.333 × 高さ 7.5**。

| 項目 | 意味 |
|---|---|
| `x`, `y` | 枠の左上の位置 |
| `w`, `h` | 枠の幅・高さ |
| `fontSize` | 文字の大きさ（pt） |
| `color` | 文字色（`#` なしの16進数） |
| `bold` | 太字にするか |
| `align` / `valign` | 横（left/center/right）・縦（top/middle/bottom）の揃え |

`divider` は、小項目のある中項目の前に入る区切りのスライド（中項目の見出しだけ。背景は表紙用）。

本文の `maxBullets`（箇条書きの最大数）と `maxCharsPerBullet`（1項目の最大文字数）は AI への指示にも使う。
`fontFace` は Mac 向けの `Hiragino Sans`。Windows で開くなら `Meiryo` などに変える。
保存すれば次の生成から反映される（再起動不要）。作成画面の「サンプル文で配置を確認」は API を使わない。
