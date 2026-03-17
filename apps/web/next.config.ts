import type { NextConfig } from 'next';
import { join } from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@preclaim/core', '@preclaim/db'],
  outputFileTracingRoot: join(import.meta.dirname!, '../../'),
};

export default nextConfig;
