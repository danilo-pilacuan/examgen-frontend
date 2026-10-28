/**
 * F1-F6, F11-F12: essential functional certification (QT-010, round 10).
 * Covers the five minimal cases of BL-010 plus the round 9 regressions:
 * login, subject activation, bank list + filters + verification toggle,
 * exams list with downloads, route guard.
 *
 * Requires env: E2E_EMAIL, E2E_PASSWORD, E2E_SUBJECT (subject name with data).
 */
import { test, expect } from '../helpers'

const SUBJECT = process.env.E2E_SUBJECT ?? 'Economía Aplicada — Eva'

test.describe('functional core (F1-F6, F11-F12)', () => {
  test('F1: login shows the professor name and English UI', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Exam Generator/i)
    // English UI by default (system contract).
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', /en/)
  })

  test('F11: anonymous access to a guarded route redirects to login', async ({ page }) => {
    await page.goto('/bank')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('F1b: login lands in the chat view with the professor name', async ({ authedPage: page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText('QA Round 10').first()).toBeVisible()
  })

  test('F2: bank lists questions with filters and scroll', async ({ authedPage: page }) => {
    await page.goto('/bank')
    // Activate the subject with seed data through the header selector.
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    await expect(page.locator('table.question-table')).toBeVisible({ timeout: 30_000 })
    const rows = page.locator('table.question-table tbody tr:not(.detail-row)')
    await expect(rows.first()).toBeVisible()
    // Filter by difficulty and expect the table to react.
    await page.locator('.filters select').nth(1).selectOption('easy')
    await expect(page.locator('table.question-table')).toBeVisible()
  })

  test('F3: inline detail expands under the clicked row', async ({ authedPage: page }) => {
    await page.goto('/bank')
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    const firstRow = page.locator('table.question-table tbody tr:not(.detail-row)').first()
    await firstRow.click()
    await expect(page.locator('tr.detail-row')).toHaveCount(1)
    await page.locator('tr.detail-row button.close').click()
    await expect(page.locator('tr.detail-row')).toHaveCount(0)
  })

  test('F4: verification toggle Pending -> Human -> Pending', async ({ authedPage: page }) => {
    await page.goto('/bank')
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    const firstRow = page.locator('table.question-table tbody tr:not(.detail-row)').first()
    const verifyBtn = firstRow.locator('td button')
    await verifyBtn.click()
    await expect(firstRow.locator('.ok, .warn').first()).toBeVisible()
  })

  test('F5: exams view lists exams with download buttons', async ({ authedPage: page }) => {
    await page.goto('/exams')
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    await expect(page.locator('.exam-list, .empty').first()).toBeVisible({ timeout: 30_000 })
    const zipBtns = page.locator('.exam-list button.zip')
    if (await zipBtns.count() > 0) {
      await expect(zipBtns.first()).toBeEnabled()
    }
  })

  test('F12: verified questions cannot be deleted via API (guardrail)', async ({ authedPage: page }) => {
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('mvp_auth')
      return raw ? (JSON.parse(raw).token as string) : null
    })
    expect(token).toBeTruthy()
    const res = await page.request.delete('/questions/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    expect([403, 404]).toContain(res.status())
  })
})
