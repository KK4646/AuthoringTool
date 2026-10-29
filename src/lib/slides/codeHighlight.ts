// コードの置き方の色分け（エディタ風）。依存を増やさないよう、よく使う言語に共通する決まりだけで簡単に切り分ける。
// pptx（pptx.ts）とプレビュー（SlidePreview）の両方がこれで色を付ける

export const CODE_COLORS = {
  text: "D4D4D4",
  keyword: "569CD6",
  control: "C586C0",
  string: "CE9178",
  number: "B5CEA8",
  comment: "6A9955",
  func: "DCDCAA",
  lineNumber: "858585",
} as const;

export type CodeRun = { text: string; color: string };
export type CodeLine = { number: string; runs: CodeRun[] };

// 宣言・型などの語
const KEYWORDS = new Set([
  "const", "let", "var", "function", "class", "def", "new", "this", "self", "true", "false", "null", "undefined",
  "None", "True", "False", "import", "from", "export", "default", "public", "private", "static", "void", "int",
  "string", "number", "boolean", "async", "await", "lambda", "struct", "fn", "type", "interface", "extends",
]);
// 流れを変える語（if・for など）
const CONTROLS = new Set([
  "if", "else", "elif", "for", "while", "do", "return", "break", "continue", "switch", "case", "try", "catch",
  "finally", "throw", "in", "of", "with", "yield", "match",
]);

// 1行を色の付いた区切りに分ける。順に、コメント・文字列・数・語・その他1文字を見ていく
const TOKEN = /(\/\/.*$|#.*$|--.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([\s\S])/gm;

function lineRuns(line: string): CodeRun[] {
  const runs: CodeRun[] = [];
  const push = (text: string, color: string) => {
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.text += text;
    else runs.push({ text, color });
  };
  for (const m of line.matchAll(TOKEN)) {
    const [all, comment, str, num, word] = m;
    if (comment) push(comment, CODE_COLORS.comment);
    else if (str) push(str, CODE_COLORS.string);
    else if (num) push(num, CODE_COLORS.number);
    else if (word) {
      const next = line.slice((m.index ?? 0) + word.length).trimStart();
      const color = KEYWORDS.has(word)
        ? CODE_COLORS.keyword
        : CONTROLS.has(word)
          ? CODE_COLORS.control
          : next.startsWith("(")
            ? CODE_COLORS.func
            : CODE_COLORS.text;
      push(word, color);
    } else push(all, CODE_COLORS.text);
  }
  return runs;
}

// コード全体を行に分け、行番号（桁をそろえる）と色の区切りを付ける
export function codeLines(code: string): CodeLine[] {
  const lines = code.split("\n");
  const width = String(lines.length).length;
  return lines.map((line, i) => ({ number: String(i + 1).padStart(width, " "), runs: lineRuns(line) }));
}
