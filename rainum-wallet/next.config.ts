import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  reactStrictMode: false, // Disable to prevent WebSocket double-connection issues
  outputFileTracingRoot: '/Users/primeupint./rainum-blockchain/rainum-wallet/rainum-wallet',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        pathname: '/logos/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/coins/images/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js
              "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
              "img-src 'self' data: https://cryptologos.cc https://assets.coingecko.com",
              "font-src 'self' data:",
              "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "rainum",
  project: "rainum-wallet",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
