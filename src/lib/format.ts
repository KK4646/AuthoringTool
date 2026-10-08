/**
 * 表示・文字列組み立ての小さなヘルパー。
 *
 * 同じ pad が date.ts にもあるが、date.ts は全アプリで内容を一致させる
 * (コピーして使う)ファイルなので、そちらには手を入れない。
 */

/** 1桁の数値を "01" のようにゼロ埋めする */
export const pad = (n: number): string => String(n).padStart(2, "0");
