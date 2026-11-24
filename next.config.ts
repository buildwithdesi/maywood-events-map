import type { NextConfig } from "next";

import { BASE_PATH } from "./lib/base-path";

// Content-Security-Policy. Inline scripts/styles stay allowed because Next.js
// bootstraps with inline <script> tags and the theme script runs before paint;
// moving to nonces would force every page to render dynamically. Everything
// else is locked to the hosts the map really uses (OpenFreeMap + CARTO styles
// and tiles). MapLibre runs its tile worker from a blob: URL.
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://tiles.openfreemap.org https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  async headers() {
    // Source paths in headers() are matched without the basePath prefix, so
    // one catch-all covers every page, API route and static asset.
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
