/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal production server for Docker (copies only what's needed).
  output: "standalone",
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
};
export default nextConfig;
