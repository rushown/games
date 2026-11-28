import type { NextConfig } from "next";

const basePath = "/games/animedraft";

const nextConfig: NextConfig = {
  // Deployed as a Vercel service mounted at /games/animedraft/ (see the root vercel.json).
  // Vercel doesn't strip the prefix, so the app has to live under it.
  basePath,
  // Baked images live in public/img/; plain <img> tags need the prefix added by hand (src/lib/images.ts).
  env: { NEXT_PUBLIC_ASSET_BASE: basePath },
  // Match the rest of the site: canonical URLs end in a slash.
  trailingSlash: true,
  // Dev only: let phones on the local network load the dev server (Next blocks other origins by default).
  allowedDevOrigins: ["192.168.*.*"],
  reactStrictMode: true,
  images: {
    // Character portraits come from AniList's CDN.
    remotePatterns: [{ protocol: "https", hostname: "s4.anilist.co" }],
  },
};

export default nextConfig;
