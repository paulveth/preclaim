import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/*/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/dist/**', '**/*.d.ts'],
    },
  },
});
