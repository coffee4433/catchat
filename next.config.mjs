import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname
    config.output.hashFunction = 'sha256'
    return config
  }
}

export default nextConfig
