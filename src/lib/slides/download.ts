import type { Deck } from "@/lib/slides/types";

// サーバーで pptx を作ってもらい、ブラウザでダウンロードさせる。失敗したらエラーを投げる
export async function downloadPptx(deck: Deck): Promise<void> {
  const res = await fetch("/api/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deck),
  });
  if (!res.ok) throw new Error("pptxの作成に失敗しました。");

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deck.title}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}

// APIを使わずに文字配置を確認するためのダミー内容。本文の置き方を1種類ずつ並べる
export const SAMPLE_DECK: Deck = {
  title: "サンプルタイトル：再生可能エネルギーの現状",
  subtitle: "レイアウト確認用",
  sections: [
    {
      heading: "1つのコンテンツ：見出しがここに入ります",
      bullets: [
        "1項目目の箇条書き。全角45文字程度までを想定した長さのサンプル文です。",
        "2項目目の箇条書き",
        "3項目目の箇条書き。数値（2025年に約30%）などが入ります。",
        "4項目目の箇条書き",
        "5項目目の箇条書き。最大5項目まで表示されます。",
      ],
      sources: [],
    },
    {
      heading: "表題なし（目次にだけ出る見出し）",
      layout: "content-no-heading",
      bullets: ["表題なしの箇条書き。見出しは出ません", "2項目目の箇条書き", "3項目目の箇条書き"],
      sources: [],
    },
    {
      heading: "タイトルのみ：見出しだけのスライド",
      layout: "title-only",
      bullets: [],
      sources: [],
    },
    {
      heading: "2つのコンテンツ：見出し",
      layout: "two-content",
      bullets: ["左の段の1項目目", "左の段の2項目目。少し長めの文です", "左の段の3項目目"],
      right: ["右の段の1項目目", "右の段の2項目目。少し長めの文です", "右の段の3項目目"],
      sources: [],
    },
    {
      heading: "比較：見出し",
      layout: "comparison",
      leftLabel: "比較するもの A",
      bullets: ["A の特徴1", "A の特徴2。少し長めの文です", "A の特徴3"],
      rightLabel: "比較するもの B",
      right: ["B の特徴1", "B の特徴2。少し長めの文です", "B の特徴3"],
      sources: [],
    },
    {
      heading: "タイトル付きのコンテンツ：見出し",
      layout: "content-with-caption",
      caption: "左側の説明文。スライドの要点を2〜3文で短く説明します。ここは箇条書きではなく文章です。",
      bullets: ["右側の箇条書き1", "右側の箇条書き2。少し長めの文です", "右側の箇条書き3"],
      sources: [],
    },
    {
      heading: "吹き出しコンテンツ：見出し",
      layout: "bubbles",
      bullets: ["左側の箇条書き1", "左側の箇条書き2。少し長めの文です", "左側の箇条書き3"],
      bubbles: ["大きい吹き出しの文。キャラクターのひとことが入ります", "小さい吹き出しの文。短い補足"],
      sources: [],
    },
    {
      heading: "コード：見出し",
      layout: "code",
      bullets: ["コードの短い説明1", "コードの短い説明2"],
      code: [
        "// 合計を求める",
        "let total = 0;",
        "for (const x of numbers) {",
        "  if (x > 0) {",
        "    total = total + x;",
        "  }",
        "}",
        "console.log(total);",
      ].join("\n"),
      sources: [],
    },
    {
      // 小項目のある中項目（区切りのスライド＋小項目ごとの本文）の配置確認用
      heading: "小項目のある中項目の見出し（区切りのスライド）",
      bullets: [],
      sources: [],
      subsections: [
        {
          heading: "小項目の見出しがここに入ります",
          bullets: ["小項目の箇条書き", "2項目目の箇条書き"],
          sources: [],
        },
      ],
    },
  ],
  sources: [{ title: "出典サイトのタイトル", url: "https://example.com/article" }],
};
