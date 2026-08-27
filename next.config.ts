import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // Proxy de dev: reenvía /api/* al backend de producción server-side, para que
  // el navegador solo vea http://localhost:3000 (mismo origin que la cookie del
  // JWT) y no pegue contra CORS/SameSite cross-site. No aplica al build de
  // producción (output: 'export' ignora rewrites ahí), solo a `next dev`.
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'https://app.excellentiafoods.com/api/:path*' }];
  },
};

export default nextConfig;
