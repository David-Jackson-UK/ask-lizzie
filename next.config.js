/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// ─── Content Security Policy ──────────────────────────────────────
// In development, CSP is relaxed to allow Next.js HMR websocket and
// webpack DevTools. In production (Netlify), the strict policy applies.
// The 'unsafe-eval' in dev is required for webpack source maps.
const cspDev = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws://localhost:* wss://localhost:*",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const cspProd = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// ─── Security headers ─────────────────────────────────────────────
// Permissions-Policy: interest-cohort is removed (deprecated, causes warnings).
// HSTS is only meaningful in production over HTTPS.
const securityHeaders = [
  { key: "Content-Security-Policy",   value: isDev ? cspDev : cspProd },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "geolocation=(), microphone=(), payment=(), usb=()" },
  ...(!isDev ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

module.exports = {
  reactStrictMode: false,  // Disabled: double-render in dev can interfere with async fetch state
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
