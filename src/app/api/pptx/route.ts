import { getAuthUser } from "@/lib/supabase/server";
import { buildPptx } from "@/lib/slides/pptx";
import { DeckSchema } from "@/lib/slides/types";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "ログインしてください。" }, { status: 401 });
  }

  const parsed = DeckSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "スライドの内容が不正です。" }, { status: 400 });
  }

  const buffer = await buildPptx(parsed.data);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(parsed.data.title)}.pptx`,
    },
  });
}
