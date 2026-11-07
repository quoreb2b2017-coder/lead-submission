// Where the Express API lives (e.g. https://leadhub-api.onrender.com). Requests to /api/* on the
// frontend's own domain are proxied there, which keeps the login cookie same-site on Vercel.
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return BACKEND_URL ? [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }] : [];
  },
  /* config options here */
  cacheComponents: true,
  async redirects() {
    return [{ source: "/dashboard/settings", destination: "/dashboard/profile", permanent: true }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
