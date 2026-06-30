import { defineConfig, configDefaults } from 'vitest/config'

const coverageConfig = {
  provider: 'v8',
  reportsDirectory: './coverage',
  clean: false,
  reporter: ['text', 'lcov'],
  include: ['src/**'],
  exclude: [...configDefaults.exclude, 'coverage', '**/test/**']
}

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: coverageConfig,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.js'],
          environment: 'node',
          env: {
            NODE_ENV: 'test'
          }
        }
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.js'],
          environment: 'node',
          globalSetup: ['./test/setup/global-db.js']
        }
      }
    ]
  }
})
