import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser, createClient } from "@/lib/supabase/server";
import { researchDeck } from "@/lib/slides/research";
import { ResearchRequestSchema } from "@/lib/slides/types";

// Web検索を含むため時間がかかる（公開環境での上限秒数）
export const maxDuration = 300;

export async function POST(request: Request) {
  // APIキーを使うので、ログインしている人だけに限る
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "ログインしてください。" }, { status: 401 });
  }

  const parsed = ResearchRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let deck;
  try {
    deck = await researchDeck(parsed.data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: toMessage(err) }, { status: 500 });
  }

  // 履歴に残す。保存に失敗しても、調べた内容は画面に返して無駄にしない
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert({ title: deck.title, subtitle: deck.subtitle, sections: deck.sections })
    .select("id")
    .single();
  if (error) {
    console.error("履歴の保存に失敗", error);
    return Response.json({ deck, id: null, saveError: "履歴への保存に失敗しました。" });
  }
  return Response.json({ deck, id: data.id });
}

// エラーを画面に出す日本語メッセージに変換する
function toMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "APIキーが未設定か無効です。.env.local の ANTHROPIC_API_KEY を確認してください。";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "APIの利用上限に達しました。少し待ってから再実行してください。";
  }
  if (err instanceof Anthropic.APIError) {
    return `Claude API エラー (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "不明なエラーが発生しました。";
}
