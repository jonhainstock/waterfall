import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node', // Use 'jsdom' if you need DOM APIs

    // Global test utilities
    globals: true,

    // Coverage configuration (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/types/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/.next/',
      ],
    },

    // Test file patterns
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],

    // Setup files
    setupFiles: ['./vitest.setup.ts'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
