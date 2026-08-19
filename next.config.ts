import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(self), camera=()',
          },
        ],
      },
      // Media proxy: allow short private cache + Range so images/videos are not truncated.
      {
        source: '/api/attachments/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=120',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Surrogate-Control',
            value: 'private',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
