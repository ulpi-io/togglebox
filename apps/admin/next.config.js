/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@togglebox/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
