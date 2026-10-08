"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadPptx, SAMPLE_DECK } from "@/lib/slides/download";
import { MAX_SECTIONS } from "@/lib/slides/types";

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

type SectionInput = { id: number; text: string };

/** タイトルと中項目を入れてリサーチを始めるフォーム。終わったら履歴の詳細へ移る */
export function DeckForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sectionInputs, setSectionInputs] = useState<SectionInput[]>([{ id: 0, text: "" }]);
  const nextId = useRef(1); // 入力欄ごとの識別番号
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  // リサーチ中の経過秒数を表示する
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const sections = sectionInputs.map((s) => s.text.trim()).filter(Boolean);
  const canSubmit = title.trim() !== "" && sections.length > 0 && !loading;

  function addSection() {
    setSectionInputs((list) => [...list, { id: nextId.current++, text: "" }]);
  }

  function removeSection(id: number) {
    setSectionInputs((list) => list.filter((s) => s.id !== id));
  }

  function updateSection(id: number, text: string) {
    setSectionInputs((list) => list.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  async function handleResearch() {
    setElapsed(0);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "リサーチに失敗しました。");
      if (!data.id) {
        // 履歴に保存できなかったときは、せめてその場でダウンロードできるようにする
        await downloadPptx(data.deck);
        throw new Error(`${data.saveError} スライドはダウンロードしました。`);
      }
      router.push(`/decks/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  async function handleSample() {
    setError("");
    try {
      await downloadPptx(SAMPLE_DECK);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          1枚目のスライドタイトル（テーマ）
          <span className="ml-2 rounded-full bg-[var(--danger)] px-2 py-0.5 text-xs text-white">
            必須
          </span>
        </span>
        <input
          className={inputClass}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：日本の再生可能エネルギーの現状"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">サブタイトル（任意・表紙に表示）</span>
        <input
          className={inputClass}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="例：2026年10月 Python基礎 LT"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium">
          中項目（1つ以上・最大{MAX_SECTIONS}個。1つにつき本文スライド1枚）
        </span>
        {sectionInputs.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-[var(--muted)]">{i + 1}.</span>
            <input
              className={inputClass}
              value={s.text}
              onChange={(e) => updateSection(s.id, e.target.value)}
              placeholder={i === 0 ? "例：太陽光発電の導入量" : "中項目を入力"}
            />
            <button
              type="button"
              className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs transition-transform active:scale-95 disabled:opacity-30"
              onClick={() => removeSection(s.id)}
              disabled={sectionInputs.length === 1}
              aria-label={`中項目${i + 1}を取り除く`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ml-8 w-fit rounded-full border border-dashed border-[var(--border-strong)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-30"
          onClick={addSection}
          disabled={sectionInputs.length >= MAX_SECTIONS}
        >
          ＋ 中項目を追加
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-foreground)] transition-transform active:scale-95 disabled:opacity-50"
          onClick={handleResearch}
          disabled={!canSubmit}
        >
          {loading ? `リサーチ中…（${elapsed}秒）` : "リサーチしてスライド案を作る"}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-transform active:scale-95"
          onClick={handleSample}
        >
          サンプル文で配置を確認（API不使用）
        </button>
      </div>

      {!canSubmit && !loading && (
        <p className="text-sm text-[var(--muted)]">
          タイトルと中項目を1つ以上入力すると実行できます。
        </p>
      )}
      {loading && (
        <p className="text-sm text-[var(--muted)]">
          中項目ごとに並行して検索しています。数分かかることがあります。
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
