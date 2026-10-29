import type { Tab } from "@/components/BottomTabBar";
import { EditIcon, HistoryIcon, SlidesIcon } from "@/components/TabIcons";

/** このアプリのタブ一覧。見た目と動きは共通の BottomTabBar が持つ */
export const TABS: Tab[] = [
  { href: "/", label: "作成", Icon: SlidesIcon },
  { href: "/decks", label: "履歴", Icon: HistoryIcon },
  { href: "/edit", label: "編集", Icon: EditIcon },
];
