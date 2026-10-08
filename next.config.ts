import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 背景画像と配置設定はサーバーで fs から読むので、Vercel でも同梱する
  outputFileTracingIncludes: {
    "/api/pptx": ["./config/**/*", "./public/backgrounds/**/*"],
    "/api/research": ["./config/**/*"],
  },
};

export default nextConfig;
