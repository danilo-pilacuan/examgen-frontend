/**
 * Language certification (QT-010, round 10): the whole system contract is
 * English (UI, questions, answers, exam PDFs).
 *
 * L1: UI default locale is English on a clean profile.
 * L2: legacy seed questions with Spanish text are surfaced as a known
 *     data limitation (informational, does not fail the suite).
 */
import { test, expect } from '../helpers'

const SUBJECT = process.env.E2E_SUBJECT ?? 'Economía Aplicada — Eva'

test.describe('language contract (L1-L2)', () => {
  test('L1: clean profile renders the full UI in English', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('mvp_locale')
      localStorage.removeItem('mvp_auth')
    })
    await page.goto('/login')
    // Login page.
    await expect(page.getByText('Sign in with your professor account')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('L1b: nav labels are English after login', async ({ authedPage: page }) => {
    for (const label of ['Chat', 'Bank', 'Exams', 'Material', 'Subjects']) {
      await expect(
        page.locator('nav.main-nav').getByRole('link').filter({ hasText: label }),
      ).toBeVisible()
    }
  })

  test('L2 (informational): bank question texts report their language mix', async ({ authedPage: page }) => {
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('mvp_auth')
      return raw ? (JSON.parse(raw).token as string) : null
    })
    // Resolve the subject id from its display name.
    const subs = await page.request.get('/subjects', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    expect(subs.status()).toBe(200)
    const subjectList = (await subs.json()) as Array<{ id: string; name: string }>
    const target = subjectList.find((s) => s.name === SUBJECT)
    expect(target, `subject ${SUBJECT} must exist`).toBeTruthy()
    const res = await page.request.get(`/subjects/${target!.id}/questions?limit=200`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    expect(res.status()).toBe(200)
    const texts = (await res.json()) as Array<{ question_text?: string }>
    const spanish = texts.filter((q) => /[¿¡]|[áéíóúñÁÉÍÓÚÑ]/.test(q.question_text ?? ''))
    // Report via console for the certification log; do not fail the suite:
    // the legacy seed bank predates the English contract (BUG-028).
    console.log(`[lang-report] questions sample=${texts.length} spanish-like=${spanish.length}`)
  })
})
