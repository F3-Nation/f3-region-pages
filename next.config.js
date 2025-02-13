/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  generateStaticParams: true,
}

module.exports = nextConfig 