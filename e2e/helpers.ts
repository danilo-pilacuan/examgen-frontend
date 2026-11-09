/** Shared helpers for the e2e certification suite (QT-010). */
import { test as base, expect, type Page } from '@playwright/test'

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
export const EMAIL = process.env.E2E_EMAIL ?? 'qa-r11@usfq.test'
export const PASSWORD = process.env.E2E_PASSWORD ?? 'QaR11-E2e-2026!'

export type Fixtures = {
  /** Page already logged in as the professor account. */
  authedPage: Page
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Sign in' }).click()
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Authenticated: redirected away from /login to the chat view.
  await expect(page).not.toHaveURL(/\/login/)
}

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await login(page)
    await use(page)
  },
})

export { expect }
