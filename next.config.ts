import type { NextConfig } from 'next';

import pkg from './package.json' with { type: 'json' };

// Equivalente del pie "v1.2.3 · a1b2c3d" de la app movil: alla sale del binario
// instalado mas el id del update OTA; aca, de package.json mas el commit que
// Vercel desplego.
const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_APP_VERSION: sha ? `v${pkg.version} · ${sha}` : `v${pkg.version}`,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Los logos de las organizaciones y las fotos de premios viven en Storage.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },

  experimental: {
    optimizePackageImports: ['react-icons'],
  },
};

export default nextConfig;
