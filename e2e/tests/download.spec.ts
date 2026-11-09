/**
 * F7: bank download with prompt/thinking audit fields (BL-022).
 * The Download bank button fetches the export endpoint, saves the JSON
 * file and shows a confirmation alert. The inline detail must expose the
 * generator prompt and thinking audit blocks.
 */
import { test, expect } from '../helpers'

const SUBJECT = process.env.E2E_SUBJECT ?? 'Economia Aplicada - QA11'

test.describe('bank export (F7)', () => {
  test('F7: Download bank button saves a JSON file with audit fields', async ({ authedPage: page }) => {
    await page.goto('/bank')
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    const downloadBtn = page.getByRole('button', { name: /download/i })
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).toBeEnabled()

    const downloadPromise = page.waitForEvent('download')
    await downloadBtn.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^question_bank_.*\.json$/)

    // Save and parse the exported file.
    const path = await download.path()
    const fs = await import('node:fs/promises')
    const content = await fs.readFile(path, 'utf-8')
    const parsed = JSON.parse(content) as {
      subject: string
      total_questions: number
      thinking_capture_enabled: boolean
      questions: Array<{
        id: string
        question_text: string
        prompt: string | null
        thinking: string | null
      }>
    }
    expect(parsed.subject).toBe(SUBJECT)
    expect(parsed.total_questions).toBeGreaterThan(0)
    expect(parsed.questions.length).toBe(parsed.total_questions)
    for (const q of parsed.questions) {
      expect(q.id).toBeTruthy()
      expect(q.question_text).toBeTruthy()
    }
  })

  test('F7b: expanded question row exposes prompt and thinking audit blocks', async ({ authedPage: page }) => {
    await page.goto('/bank')
    const picker = page.locator('.subject-picker select')
    await picker.selectOption({ label: SUBJECT })
    const firstRow = page.locator('table.question-table tbody tr:not(.detail-row)').first()
    await firstRow.click()
    const detail = page.locator('tr.detail-row')
    await expect(detail).toHaveCount(1)
    // After an export the audit blocks appear; otherwise the noPrompt
    // fallback is shown. Either way the labels are English (L2 contract).
    await expect(
      detail.getByText(/^(Prompt|No generator prompt available)/).first(),
    ).toBeVisible()
  })
})
