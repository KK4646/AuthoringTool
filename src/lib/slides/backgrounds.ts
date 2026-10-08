import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database, "slideapp">;

// 設定画面でアップロードした背景画像の置き場所（0104 で作った非公開バケット）
export const BACKGROUND_BUCKET = "slideapp-backgrounds";

// title = 表紙、content = 目次・本文・出典
export const BACKGROUND_SLOTS = ["title", "content"] as const;
export type BackgroundSlot = (typeof BACKGROUND_SLOTS)[number];

// バケットの設定（0104）と同じ値。先に画面で弾いて分かりやすいエラーを出す
export const BACKGROUND_MIME_TYPES = ["image/png", "image/jpeg"];
export const BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;

// キーは本人のフォルダ＋枠の名前で固定。上書きで差し替える
export function backgroundPath(userId: string, slot: BackgroundSlot): string {
  return `${userId}/${slot}`;
}

function isSlot(name: string): name is BackgroundSlot {
  return (BACKGROUND_SLOTS as readonly string[]).includes(name);
}

// アップロード済みの枠の一覧
async function uploadedSlots(
  supabase: Client,
  userId: string,
): Promise<BackgroundSlot[]> {
  const { data } = await supabase.storage.from(BACKGROUND_BUCKET).list(userId);
  return (data ?? []).map((file) => file.name).filter(isSlot);
}

/**
 * 設定画面の見本用に、アップロード済みの画像の一時URLを返す。未設定の枠は含まない。
 */
export async function getBackgroundPreviewUrls(
  supabase: Client,
  userId: string,
): Promise<Partial<Record<BackgroundSlot, string>>> {
  const slots = await uploadedSlots(supabase, userId);
  if (slots.length === 0) return {};

  const { data } = await supabase.storage
    .from(BACKGROUND_BUCKET)
    .createSignedUrls(
      slots.map((slot) => backgroundPath(userId, slot)),
      60 * 60,
    );

  const urls: Partial<Record<BackgroundSlot, string>> = {};
  slots.forEach((slot, i) => {
    const url = data?.[i]?.signedUrl;
    if (url) urls[slot] = url;
  });
  return urls;
}

/**
 * pptx に埋め込むため、アップロード済みの画像を pptxgenjs の data 形式
 * （"image/png;base64,..."）で返す。未設定・読めなかった枠は含まない（既定の画像を使う）。
 */
export async function loadUserBackgrounds(
  supabase: Client,
  userId: string,
): Promise<Partial<Record<BackgroundSlot, string>>> {
  const slots = await uploadedSlots(supabase, userId);
  const result: Partial<Record<BackgroundSlot, string>> = {};

  await Promise.all(
    slots.map(async (slot) => {
      const { data: blob } = await supabase.storage
        .from(BACKGROUND_BUCKET)
        .download(backgroundPath(userId, slot));
      if (!blob) return;
      const type = BACKGROUND_MIME_TYPES.includes(blob.type) ? blob.type : "image/png";
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      result[slot] = `${type};base64,${base64}`;
    }),
  );
  return result;
}
