import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['127.0.0.1'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },

  webpack: (config) => {
    config.resolve.alias['@'] = __dirname
    config.output.hashFunction = 'sha256'

    const mainNodeModules = path.join(__dirname, 'node_modules')
    config.resolve.alias = {
      ...config.resolve.alias,
      three: path.join(mainNodeModules, 'three'),
      '@react-three/drei': path.join(mainNodeModules, '@react-three/drei'),
      '@react-three/fiber': path.join(mainNodeModules, '@react-three/fiber'),
      '@react-three/rapier': path.join(mainNodeModules, '@react-three/rapier'),
      'three-stdlib': path.join(mainNodeModules, 'three-stdlib'),
      '@dimforge/rapier3d-compat': path.join(mainNodeModules, '@dimforge/rapier3d-compat'),
    }

    return config
  }
}

export default nextConfig
