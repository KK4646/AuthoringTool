import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic, Quicksand, Noto_Sans_JP } from "next/font/google";
import { BottomTabBar } from "@/components/BottomTabBar";
import { getAuthUser } from "@/lib/supabase/server";
import { DEFAULT_ACCENT_COLOR } from "@/lib/colors";
import "./globals.css";

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// スライドのプレビュー用（pptx と同じフォント。config/layout.json の fontFace）
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "スライドメーカー",
  description: "テーマと中項目からWeb検索して、背景画像に合わせたpptxを作る",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getAuthUser();

  return (
    <html
      lang="ja"
      className={`${zenMaruGothic.variable} ${quicksand.variable} ${notoSansJp.variable} h-full antialiased`}
      // テーマカラーはブルーで固定（設定画面では選ばない。../CLAUDE.md の「既知の差異」）
      style={{ "--accent": DEFAULT_ACCENT_COLOR } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <div
          className={
            user
              ? "flex flex-1 flex-col md:mx-auto md:w-full md:max-w-3xl md:flex-row md:items-start"
              : "flex flex-1 flex-col"
          }
        >
          {user && <BottomTabBar />}
          <div
            className={
              user
                ? "flex min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
                : "flex flex-1 flex-col"
            }
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
