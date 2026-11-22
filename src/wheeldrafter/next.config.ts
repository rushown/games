import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Deployed as a Vercel service mounted at /games/wheeldrafter/ (see the root vercel.json).
  // Vercel doesn't strip the prefix, so the app has to live under it.
  basePath: "/games/wheeldrafter",
  // Match the rest of the site: canonical URLs end in a slash.
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
