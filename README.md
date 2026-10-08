# slide-app

テーマと中項目から Web 検索して、背景画像に合わせた .pptx を作る。

```
cp .env.example .env.local   # 値を入れる（ANTHROPIC_API_KEY も）
npm install
npm run dev                  # http://localhost:3009
npm test
```

## 背景画像の差し替え

画像は `public/backgrounds/` に同梱している（1920×1080。素材の番号つき `01-main-title.png` 〜 `05-bubbles.png`）。
同じ名前で上書きすれば差し替わる。どのスライドにどの画像を使うかは `config/layout.json` の `background`。
今は表紙＝01、目次＝02、区切り＝03、本文・出典＝04（吹き出しの置き方は 05）。
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

`divider` は、小項目のある中項目の前に入る区切りのスライド（中項目の見出しだけ。背景は 03 セクション名）。

本文スライドは `layouts` に置き方ごとの背景と枠を書く。枠がある項目だけが描かれる。

| 置き方（キー） | 名前 | 使う枠 |
|---|---|---|
| `content` | 1つのコンテンツ | `heading` `body` |
| `content-no-heading` | 1つのコンテンツ(表題なし) | `body` |
| `title-only` | タイトルのみ | `heading` |
| `two-content` | 2つのコンテンツ | `heading` `left` `right` |
| `comparison` | 比較 | `heading` `leftLabel` `left` `rightLabel` `right` |
| `content-with-caption` | タイトル付きのコンテンツ | `heading` `caption`（左の説明文） `body` |
| `bubbles` | 吹き出しコンテンツ | `heading` `body` `bubbleLarge` `bubbleSmall` |

`content` の `maxBullets`（箇条書きの最大数）と `maxCharsPerBullet`（1項目の最大文字数）は AI への指示にも使う。
`fontFace` は `Noto Sans JP`（2026-10-08 にユーザーの指定で変更）。開く端末に入っていないと別のフォントで表示される。
保存すれば次の生成から反映される（再起動不要）。作成画面の「サンプル文で配置を確認」は API を使わず、本文の置き方を1種類ずつ並べた .pptx を出す。
タイトル・サブタイトルを入力してあれば、表紙はその文で出る（空欄はダミーの文）。
