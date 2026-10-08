// 日付・時刻のユーティリティ（全アプリ共通）。
//
// 【前提】利用者は全員日本在住・JSTのみ。複数タイムゾーン対応は実装しない。
// ただし「TZを扱わない」＝「何もしない」ではない。Vercel の Node ランタイムも
// Supabase Edge Function も既定は UTC で、vercel.json の regions を hnd1（東京）に
// しても TZ は UTC のままなので、素の new Date().getDate() などを使うと日付が1日ずれる。
// そのためこのファイルの関数はすべて、実行環境のタイムゾーンに一切依存せず
// JST(+09:00)固定で計算する（内部は Date.UTC / getUTC* / toISOString だけを使う）。
//
// 【使い方の原則】
// - 「今日」「今月」は todayJst() / currentYearMonthJst() だけを使う
// - timestamptz から日付・時刻を取り出すときは jstDateString / jstTimeString を使う
// - new Date().getFullYear() / getMonth() / getDate() / getHours()、
//   toISOString().slice(0, 10)、timeZone 指定なしの toLocaleDateString / toLocaleString は使わない
//
// このファイルは my-apps 配下の全アプリで同一。直すときは他アプリにも反映すること
// （コピー元は scheduler/src/lib/date.ts）。
// 共通パッケージ化はせず、新規アプリはこのファイルをコピーして使う。

/** JSTのUTCオフセット。timestamptz文字列を組み立てるときに使う */
export const JST_OFFSET = "+09:00";

/** JSTのUTCオフセット(ミリ秒)。JSTには夏時間が無いので固定値でよい */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// 「今」を取る（ここが最もずれやすい）
// ---------------------------------------------------------------------------

/** timestamptz文字列(ISO)を、JST基準の "YYYY-MM-DD" に変換する */
export function jstDateString(iso: string): string {
  // getTime() は絶対時刻(エポックms)なので実行環境のTZに依存しない。
  // そこへ+9時間して、常にUTC表記の toISOString() で切り出す＝JSTの日付になる。
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

/** timestamptz文字列(ISO)を、JST基準の "HH:MM" に変換する */
export function jstTimeString(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  return `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`;
}

/**
 * timestamptz文字列(ISO)を、<input type="datetime-local"> 相当の
 * "YYYY-MM-DDTHH:MM"（JST基準）に変換する。編集フォームの初期値用。
 */
export function jstDateTimeLocalString(iso: string): string {
  return `${jstDateString(iso)}T${jstTimeString(iso)}`;
}

/** サーバーのタイムゾーンに関わらず、JSTの「今日」を "YYYY-MM-DD" で返す */
export function todayJst(): string {
  return jstDateString(new Date().toISOString());
}

/** サーバーのタイムゾーンに関わらず、JSTの「今月」を "YYYY-MM" で返す */
export function currentYearMonthJst(): string {
  return todayJst().slice(0, 7);
}

/** JSTの「今」を "HH:MM" で返す */
export function nowTimeJst(): string {
  return jstTimeString(new Date().toISOString());
}

/** JST基準で、その日付の00:00を表すtimestamptz文字列(ISO)。DBへ書くときに使う */
export function jstDayStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00${JST_OFFSET}`;
}

/** JST基準で、"YYYY-MM-DD" + "HH:MM" を timestamptz文字列(ISO)にする */
export function jstIso(dateStr: string, time: string): string {
  return `${dateStr}T${time}:00${JST_OFFSET}`;
}

// ---------------------------------------------------------------------------
// "YYYY-MM-DD" 文字列どうしの計算（Date.UTC + getUTC* のみ。TZ非依存）
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" に日数を足し引きする */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" の曜日を返す(0=日 .. 6=土) */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM-DD" を、その週(日曜始まり)の日曜日に丸める */
export function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0=日 ... 6=土
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

/** 週の7日分の "YYYY-MM-DD" 配列(日曜始まり) */
export function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "YYYY-MM" の月初 "YYYY-MM-01" を返す */
export function monthStartOf(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${y}-${pad(m)}-01`;
}

/** "YYYY-MM" の末日 "YYYY-MM-DD" を返す（Date.UTCの day=0 で前月末を求める定番） */
export function monthEndOf(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(lastDay)}`;
}

/** "YYYY-MM-DD" が実在する日付か（2026-02-30 のような繰り上がりを弾く） */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// ---------------------------------------------------------------------------
// 表示・入力の整形（TZとは無関係だが日付まわりなのでここに置く）
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? "?";
}

/** "2026-04-06" → "4/6(月)" */
export function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}(${weekdayLabel(weekdayOf(dateStr))})`;
}

/**
 * 曜日トグルの並び順は月曜始まり(月火水木金土日)にする。
 * DBの値は 0=日 のままなので、表示・並び替えのときだけこの順を使う。
 */
export const MONDAY_FIRST_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

/** 月曜始まりで何番目の曜日か(月=0 .. 日=6)。並び替え用 */
export function mondayFirstIndex(weekday: number): number {
  return weekday === 0 ? 6 : weekday - 1;
}

/** "HH:MM" または "HH:MM:SS" を受け取り "HH:MM" に正規化する。不正なら null */
export function normalizeTime(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return `${pad(hh)}:${pad(mm)}`;
}

/** 打ちやすい入力を "HH:MM" に整える。整えられなければ入力のまま返す */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return raw.trim();

  let hh: number;
  let mm: number;
  if (digits.length <= 2) {
    // 「9」「10」→ 9:00 / 10:00
    hh = Number(digits);
    mm = 0;
  } else if (digits.length === 3) {
    // 「930」→ 9:30
    hh = Number(digits.slice(0, 1));
    mm = Number(digits.slice(1));
  } else if (digits.length === 4) {
    hh = Number(digits.slice(0, 2));
    mm = Number(digits.slice(2));
  } else {
    return raw.trim();
  }

  if (hh > 23 || mm > 59) return raw.trim();
  return `${pad(hh)}:${pad(mm)}`;
}
