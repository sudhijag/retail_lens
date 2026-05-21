import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com',         pathname: '/**' },
      { protocol: 'https', hostname: 'm.media-amazon.com',          pathname: '/**' },
      { protocol: 'https', hostname: 'target.scene7.com',           pathname: '/**' },
      { protocol: 'https', hostname: 'i5.walmartimages.com',        pathname: '/**' },
    ],
  },
}

export default nextConfig
