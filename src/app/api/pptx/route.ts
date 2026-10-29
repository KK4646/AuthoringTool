import { createClient, getAuthUser } from "@/lib/supabase/server";
import { DIAGRAM_BUCKET, diagramCodes, diagramPath } from "@/lib/slides/diagram";
import { buildPptx, type DiagramImages } from "@/lib/slides/pptx";
import { DeckSchema, type Deck } from "@/lib/slides/types";

// スライドにある図解の記法ごとに、保存済みの PNG を Storage から読む（詳細画面で一度描いた図だけある）
async function loadDiagramImages(userId: string, deck: Deck): Promise<DiagramImages> {
  const codes = new Set(diagramCodes(deck));
  const supabase = await createClient();
  const images: DiagramImages = new Map();
  await Promise.all(
    [...codes].map(async (code) => {
      const { data } = await supabase.storage.from(DIAGRAM_BUCKET).download(await diagramPath(userId, code));
      if (data) images.set(code, `image/png;base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`);
    }),
  );
  return images;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "ログインしてください。" }, { status: 401 });
  }

  const parsed = DeckSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "スライドの内容が不正です。" }, { status: 400 });
  }

  const buffer = await buildPptx(parsed.data, await loadDiagramImages(user.id, parsed.data));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(parsed.data.title)}.pptx`,
    },
  });
}
