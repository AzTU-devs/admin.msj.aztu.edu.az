const isDev = process.env.NODE_ENV !== "production";

// Browser calls normally go through the same-origin /api rewrite; only when
// NEXT_PUBLIC_API_URL points the client straight at the backend does that
// origin need to be allowed for fetch/XHR.
function apiOrigin() {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "";
  } catch {
    return "";
  }
}

/**
 * Content-Security-Policy for the portal. This app holds the access tokens of
 * editors and super-admins, so it gets the tightest policy the framework
 * allows: no third-party scripts, no plugins, no framing, no off-site form
 * posts. 'unsafe-inline' for scripts is required by Next's inline bootstrap
 * (and the theme pre-paint script) without per-request nonces; everything
 * else is locked to this origin.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal production server for Docker (copies only what's needed).
  output: "standalone",
  // Don't advertise the framework (and its version) to scanners.
  poweredByHeader: false,
  async rewrites() {
    // Server-side proxy: browser calls stay same-origin (/api, /files) and the
    // Next server forwards them to the backend. API_URL is the internal backend
    // URL in Docker (e.g. http://backend:8080); falls back for local dev.
    const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/files/:path*", destination: `${api}/files/:path*` },
    ];
  },
  async headers() {
    return [
      {
        // Pages only: /api and /files responses carry the backend's own headers.
        source: "/((?!api/|files/).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // the portal's URLs (submission ids, review links) stay on this origin
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // a private portal: keep its sign-in and dashboard pages out of search results
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default nextConfig;
