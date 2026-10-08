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

// APIを使わずに文字配置を確認するためのダミー内容
export const SAMPLE_DECK: Deck = {
  title: "サンプルタイトル：再生可能エネルギーの現状",
  subtitle: "レイアウト確認用",
  sections: [
    {
      heading: "中項目の見出しがここに入ります",
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
