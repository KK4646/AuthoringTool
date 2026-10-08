"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/tabs";

export type Tab = {
  href: string;
  label: string;
  Icon: (props: { active: boolean; size?: number }) => ReactNode;
  /** 選択中かどうかを自前で決めたいタブだけ書く。省略時は href の前方一致 */
  match?: (pathname: string) => boolean;
};

/**
 * ログイン中のタブ切り替え。スマホでは画面下部のタブバー、
 * PC(md以上)では画面左側の縦並びサイドバーに切り替わる。
 *
 * <button onClick={router.push}> ではなく <Link> を使う。Next.jsのプリフェッチは
 * ビューポートに入った<Link>にしか働かないため、buttonのままだと全タブが
 * ノープリフェッチになる。ほぼ毎回開く記録・一覧・集計は他画面からの遷移で
 * 副次的に温まるが、たまにしか開かないタブだけ体感できるほど遅く出ていた。
 *
 * この部品は全アプリ共通(正本は db-schemas/shared)。どのタブを出すかは
 * 各アプリの src/lib/tabs.ts に書く。
 */
export function BottomTabBar() {
  const pathname = usePathname();

  function isActive(tab: Tab) {
    if (tab.match) return tab.match(pathname);
    return tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
  }

  return (
    <>
      {/* スマホ: 画面下部のタブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center md:hidden">
        <div className="flex w-full max-w-md border-t border-[var(--border)] bg-[var(--background)] pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => {
            const { href, label, Icon } = tab;
            const active = isActive(tab);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 text-xs transition-[color,transform] duration-150 ease-out active:scale-90 ${
                  active
                    ? "font-semibold text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--accent)]"
                }`}
              >
                {/* 選択中を示す上端のバー */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 mx-auto h-0.5 w-10 rounded-full transition-colors ${
                    active ? "bg-[var(--accent)]" : "bg-transparent"
                  }`}
                />
                {/* アイコン背景。選択中はアクセント色を薄く敷く */}
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-[var(--accent)]/12" : "bg-transparent"
                  }`}
                >
                  <Icon active={active} size={26} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PC: メインコンテンツの左側に並ぶ縦並びサイドバー(区切り線なし、画面最左には固定しない) */}
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 p-4 pt-8 md:flex">
        {TABS.map((tab) => {
          const { href, label, Icon } = tab;
          const active = isActive(tab);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-left text-[15px] transition-colors duration-150 ease-out ${
                active
                  ? "bg-[var(--accent)]/12 font-semibold text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--accent)]/8 hover:text-[var(--accent)]"
              }`}
            >
              <Icon active={active} size={22} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
