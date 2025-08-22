/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Add this if you're using environment variables
  env: {
    // Add any client-side environment variables here
  },
  // Enable React DevTools in production
  productionBrowserSourceMaps: true,
  // Handle 404s in client-side routing
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/',
      },
    ]
  },
}

module.exports = nextConfig
