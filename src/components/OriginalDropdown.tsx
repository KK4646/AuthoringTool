"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

/**
 * ブラウザ標準の<select>の代わりに使う自作のドロップダウン。
 * ボタンをタップすると選択肢のパネルが開く。
 */
export function OriginalDropdown({
  name,
  value,
  onChange,
  options,
  placeholder = "選択してください",
  required = false,
}: {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-[var(--accent)]/8"
      >
        <span className={selected ? "" : "text-[var(--muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <span
          aria-hidden
          className={`text-[var(--muted)] transition-transform duration-150 ease-out ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {/* 開くときも閉じるときも上下に伸び縮みさせるため、閉じていてもDOMは残して高さだけ0にする */}
      <div
        className={`absolute z-20 mt-1 grid w-full transition-[grid-template-rows,opacity] duration-200 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ul
            role="listbox"
            className="max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors duration-150 ease-out ${
                    opt.value === value
                      ? "bg-[var(--accent)]/12 font-medium text-[var(--accent)]"
                      : "hover:bg-[var(--accent)]/8"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
