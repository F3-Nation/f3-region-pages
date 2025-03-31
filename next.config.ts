import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    'drizzle-orm',
    '@swc/core',
    '@swc/helpers',
    'pg',
    'postgres',
    'mysql2',
    'better-sqlite3',
    'sqlite3',
    'better-sqlite3',
    'mysql',
    'pg-native',
    'pg-connection-string',
    'pg-types',
    'pg-pool',
    'pgpass',
    'pg-protocol',
    'pg-format',
    'pg-connection-string',
    'pg-types',
    'pg-pool',
    'pgpass',
    'pg-protocol',
    'pg-format',
  ],
  webpack: (config, { isServer }) => {
    // Add resolve.fallback for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
