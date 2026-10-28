import { defineConfig, devices } from '@playwright/test'

/**
 * E2E certification suite (BL-010 / QT-010).
 * Runs against the Docker stack: frontend at http://localhost:3000,
 * API proxied through the frontend nginx (same origin).
 *
 * Run:
 *   cd projects/frontend && npx playwright test
 *
 * Credentials come from env (see e2e/.env.example):
 *   E2E_EMAIL / E2E_PASSWORD  professor account used by the suite
 *   E2E_BASE_URL              defaults to http://localhost:3000
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/artifacts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
