import type { Tab } from "@/components/BottomTabBar";
import { GearIcon, HistoryIcon, SlidesIcon } from "@/components/TabIcons";

/** このアプリのタブ一覧。見た目と動きは共通の BottomTabBar が持つ */
export const TABS: Tab[] = [
  { href: "/", label: "作成", Icon: SlidesIcon },
  { href: "/decks", label: "履歴", Icon: HistoryIcon },
  { href: "/settings", label: "設定", Icon: GearIcon },
];
