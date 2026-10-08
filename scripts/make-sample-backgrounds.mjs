// 動作確認用の仮背景画像（1920×1080のグラデーション）を作る。
// すでに同名ファイルがある場合は上書きしない。
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const W = 1920;
const H = 1080;
const outDir = path.join(process.cwd(), "public", "backgrounds");

// PNGのチャンク（長さ・種類・データ・CRC）を組み立てる
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

// 左上の色 from から右下の色 to へのグラデーション
function gradientPng(from, to) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1);
    raw[row] = 0; // フィルタなし
    for (let x = 0; x < W; x++) {
      const t = (x / W + y / H) / 2;
      for (let c = 0; c < 3; c++) {
        raw[row + 1 + x * 3 + c] = Math.round(from[c] + (to[c] - from[c]) * t);
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0);
  header.writeUInt32BE(H, 4);
  header[8] = 8; // ビット深度
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const files = {
  "title.png": gradientPng([31, 42, 68], [52, 88, 140]),
  "content.png": gradientPng([250, 251, 254], [226, 233, 245]),
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, png] of Object.entries(files)) {
  const file = path.join(outDir, name);
  if (fs.existsSync(file)) {
    console.log(`スキップ（既存）: ${file}`);
    continue;
  }
  fs.writeFileSync(file, png);
  console.log(`作成: ${file}`);
}
