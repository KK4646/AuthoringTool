import { createClient } from "@/lib/supabase/server";
import { jstDateString, jstTimeString } from "@/lib/date";
import { parseSections, parseSources, type Deck } from "@/lib/slides/types";

// 履歴・編集タブの一覧の1行分
export type DeckSummary = { id: string; title: string; sectionCount: number; createdLabel: string };

// 本人のスライド案の一覧（新しい順）
export async function listDeckSummaries(): Promise<DeckSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("decks")
    .select("id, title, sections, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    sectionCount: parseSections(d.sections).length,
    createdLabel: `${jstDateString(d.created_at)} ${jstTimeString(d.created_at)}`,
  }));
}

// スライド案1件。無ければ null
export async function getDeck(id: string): Promise<{ deck: Deck; createdAt: string } | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("decks")
    .select("title, subtitle, sections, sources, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  return {
    deck: {
      title: row.title,
      subtitle: row.subtitle,
      sections: parseSections(row.sections),
      sources: parseSources(row.sources),
    },
    createdAt: row.created_at,
  };
}
