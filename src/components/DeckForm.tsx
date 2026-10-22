"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { downloadPptx, SAMPLE_DECK } from "@/lib/slides/download";
import {
  countContentSlides,
  type Outline,
} from "@/lib/slides/types";
import { MAX_TEMPLATE_NAME, type Template } from "@/lib/slides/templates";
import { saveTemplateAction } from "@/app/templates/actions";
import { OriginalDropdown } from "@/components/OriginalDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

type TextInput = { id: number; text: string };
// 中項目1つ分の入力欄。subs は小項目（任意）
type SectionInput = TextInput & { subs: TextInput[] };

/**
 * タイトルと中項目（任意で小項目）を入れてリサーチを始めるフォーム。終わったら履歴の詳細へ移る。
 * 中項目・小項目はテンプレートから埋めたり、今の内容をテンプレートとして保存したりできる
 */
export function DeckForm({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sectionInputs, setSectionInputs] = useState<SectionInput[]>([
    { id: 0, text: "", subs: [] },
  ]);
  const nextId = useRef(1); // 入力欄ごとの識別番号
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  // テンプレート
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false); // 保存欄を開いているか
  const [templateName, setTemplateName] = useState("");
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const [templateMessage, setTemplateMessage] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [isSavingTemplate, startSaveTemplate] = useTransition();

  // リサーチ中の経過秒数を表示する
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  // 空欄を除いた中項目・小項目。空欄の中項目の下の小項目も除く
  const sections: Outline[] = sectionInputs
    .map((s) => ({
      heading: s.text.trim(),
      subheadings: s.subs.map((sub) => sub.text.trim()).filter(Boolean),
    }))
    .filter((o) => o.heading !== "");
  const slideCount = countContentSlides(sections);
  const canSubmit = title.trim() !== "" && sections.length > 0 && !loading;

  function addSection() {
    setSectionInputs((list) => [...list, { id: nextId.current++, text: "", subs: [] }]);
  }

  function removeSection(id: number) {
    setSectionInputs((list) => list.filter((s) => s.id !== id));
  }

  function updateSection(id: number, text: string) {
    setSectionInputs((list) => list.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function addSub(sectionId: number) {
    setSectionInputs((list) =>
      list.map((s) =>
        s.id === sectionId ? { ...s, subs: [...s.subs, { id: nextId.current++, text: "" }] } : s,
      ),
    );
  }

  function removeSub(sectionId: number, subId: number) {
    setSectionInputs((list) =>
      list.map((s) =>
        s.id === sectionId ? { ...s, subs: s.subs.filter((sub) => sub.id !== subId) } : s,
      ),
    );
  }

  function updateSub(sectionId: number, subId: number, text: string) {
    setSectionInputs((list) =>
      list.map((s) =>
        s.id === sectionId
          ? { ...s, subs: s.subs.map((sub) => (sub.id === subId ? { ...sub, text } : sub)) }
          : s,
      ),
    );
  }

  // テンプレートを選ぶと、中項目・小項目をその内容で置き換える
  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template || template.sections.length === 0) return;
    setSectionInputs(
      template.sections.map((o) => ({
        id: nextId.current++,
        text: o.heading,
        subs: o.subheadings.map((text) => ({ id: nextId.current++, text })),
      })),
    );
  }

  function openSaveTemplate() {
    // 選んだテンプレートがあればその名前を入れておく（そのまま保存すると上書き）
    setTemplateName(templates.find((t) => t.id === templateId)?.name ?? "");
    setTemplateMessage("");
    setTemplateError("");
    setSaving(true);
  }

  function requestSaveTemplate() {
    const name = templateName.trim();
    if (templates.some((t) => t.name === name)) {
      setConfirmingOverwrite(true);
      return;
    }
    saveTemplate();
  }

  function saveTemplate() {
    setConfirmingOverwrite(false);
    setTemplateError("");
    startSaveTemplate(async () => {
      const result = await saveTemplateAction(templateName, sections);
      if (result.error) {
        setTemplateError(result.error);
        return;
      }
      setSaving(false);
      setTemplateMessage(`テンプレート「${templateName.trim()}」を保存しました。`);
    });
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
      // 入力済みのタイトル・サブタイトルがあれば表紙のサンプル文に使う（空欄はダミーの文のまま）
      await downloadPptx({
        ...SAMPLE_DECK,
        title: title.trim() || SAMPLE_DECK.title,
        subtitle: subtitle.trim() || SAMPLE_DECK.subtitle,
      });
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
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">サブタイトル（任意・表紙に表示）</span>
        <input
          className={inputClass}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium">
          中項目（1つ以上。1つにつき本文スライド1枚）
        </span>
        <span className="text-xs text-[var(--muted)]">
          小項目（任意）を入れると、中項目は区切りのスライドになり、小項目ごとに本文スライドを作ります。
        </span>
        {templates.length > 0 && (
          // ドロップダウンは既定で全幅なので、親で幅を止める（共通ルール「トグルの横幅」）
          <div className="max-w-xs">
            <OriginalDropdown
              value={templateId}
              onChange={applyTemplate}
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="テンプレートから入れる"
            />
          </div>
        )}
        {sectionInputs.map((s, i) => (
          <div key={s.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-[var(--muted)]">{i + 1}.</span>
              <input
                className={inputClass}
                value={s.text}
                onChange={(e) => updateSection(s.id, e.target.value)}
                placeholder="中項目を入力"
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
            {s.subs.map((sub, j) => (
              <div key={sub.id} className="ml-8 flex items-center gap-2">
                <span className="w-8 shrink-0 text-right text-xs text-[var(--muted)]">
                  {i + 1}-{j + 1}
                </span>
                <input
                  className={inputClass}
                  value={sub.text}
                  onChange={(e) => updateSub(s.id, sub.id, e.target.value)}
                  placeholder="小項目を入力"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs transition-transform active:scale-95"
                  onClick={() => removeSub(s.id, sub.id)}
                  aria-label={`小項目${i + 1}-${j + 1}を取り除く`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ml-18 w-fit rounded-full border border-dashed border-[var(--border-strong)] px-3 py-1 text-xs transition-transform active:scale-95 disabled:opacity-30"
              onClick={() => addSub(s.id)}
            >
              ＋ 小項目を追加
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ml-8 w-fit rounded-full border border-dashed border-[var(--border-strong)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-30"
          onClick={addSection}
        >
          ＋ 中項目を追加
        </button>

        {saving ? (
          <div className="ml-8 flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
            <input
              className={inputClass}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={MAX_TEMPLATE_NAME}
              placeholder="テンプレート名"
              aria-label="テンプレート名"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaving(false)}
                disabled={isSavingTemplate}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={requestSaveTemplate}
                disabled={isSavingTemplate || templateName.trim() === "" || sections.length === 0}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm text-[var(--accent-foreground)] transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSavingTemplate ? "保存中…" : "保存"}
              </button>
            </div>
            {templateError && <p className="text-sm text-red-600">{templateError}</p>}
          </div>
        ) : (
          <button
            type="button"
            className="ml-8 w-fit rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-30"
            onClick={openSaveTemplate}
            disabled={sections.length === 0}
          >
            中項目をテンプレートに保存
          </button>
        )}
        {templateMessage && <p className="ml-8 text-sm text-[var(--muted)]">{templateMessage}</p>}
      </div>

      {confirmingOverwrite && (
        <ConfirmDialog
          message={`テンプレート「${templateName.trim()}」はすでにあります。今の中項目で上書きしますか？`}
          confirmLabel="上書きする"
          onConfirm={saveTemplate}
          onCancel={() => setConfirmingOverwrite(false)}
        />
      )}

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

      {sections.length > 0 && (
        <p className="text-sm text-[var(--muted)]">
          本文スライド {slideCount}枚
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
