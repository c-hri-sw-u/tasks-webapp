/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_EXPORT ? 'export' : undefined,
}

module.exports = nextConfig
