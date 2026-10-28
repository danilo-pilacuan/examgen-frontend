/* BUG-026 live verification: the header chips must load subject stats on
 * every path that sets the active subject. Drives the REAL app (nginx
 * bundle rebuilt with the fix).
 * Paths covered:
 *   1. session restore: valid token + active subject in localStorage (the
 *      user closed the browser without logging out) -> chips show real
 *      counts with ZERO interaction (this was the 0/0 bug).
 *   2. Subjects "Activate" button.
 *   3. combobox switch (regression C10).
 */
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const EMAIL = 'qa-r11@usfq.test';
const PASSWORD = 'QaR11-E2e-2026!';
const DB_ID = 'ae0055a1-ddfd-4e3f-b725-824e1e507179';
const ECON_ID = '6c9e3cc3-6599-4868-a8a4-685bbb12bc30';

async function apiLogin(request) {
  const res = await request.post(`${BASE}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}: ${await res.text()}`);
  return await res.json(); // { access_token, user, ... }
}

async function counts(request, token, id) {
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const qr = await request.get(`${BASE}/subjects/${id}/questions`, { headers: h });
  const mr = await request.get(`${BASE}/subjects/${id}/material`, { headers: h });
  if (!qr.ok() || !mr.ok()) throw new Error(`counts ${id}: q=${qr.status()} m=${mr.status()}`);
  const q = await qr.json();
  const m = await mr.json();
  return {
    q: Array.isArray(q) ? q.length : (q.questions ?? []).length,
    c: Array.isArray(m) ? m.length : (m.chunks ?? []).length,
  };
}

const bar = page => page.locator('.context-bar');

test('BUG-026 chips load on all active-subject paths', async ({ page, request }) => {
  const body = await apiLogin(request);
  const token = body.access_token;
  const db = await counts(request, token, DB_ID);
  const econ = await counts(request, token, ECON_ID);
  console.log(`DB truth: DB Systems ${db.q}q/${db.c}c; Econ ${econ.q}q/${econ.c}c`);

  // Path 1: session restore. Seed localStorage exactly as a browser that
  // was closed without logging out: valid token + active subject.
  await page.addInitScript(
    ({ token, user, subjectId }) => {
      localStorage.setItem('mvp_auth', JSON.stringify({ token, user }));
      localStorage.setItem('mvp_active_subject', subjectId);
    },
    { token, user: body.user, subjectId: DB_ID },
  );
  await page.goto(`${BASE}/`);
  await expect(bar(page)).toContainText('Database Systems', { timeout: 15000 });
  await expect(bar(page)).toContainText(`${db.q} questions`);
  await expect(bar(page)).toContainText(`${db.c} chunks`);
  console.log('after session restore:', (await bar(page).innerText()).replace(/\n/g, ' | '));

  // Path 2: Subjects -> Activate on the other subject.
  await page.click('a[href="/subjects"]');
  const econCard = page.locator('li', { hasText: 'Economia Aplicada - QA11' });
  await econCard.locator('button:has-text("Activate")').click();
  await expect(bar(page)).toContainText('Economia Aplicada - QA11', { timeout: 15000 });
  await expect(bar(page)).toContainText(`${econ.q} questions`);
  await expect(bar(page)).toContainText(`${econ.c} chunks`);
  console.log('after Activate:', (await bar(page).innerText()).replace(/\n/g, ' | '));

  // Path 3: combobox switch back (regression C10).
  await page.selectOption('#subject-select', DB_ID);
  await expect(bar(page)).toContainText('Database Systems', { timeout: 15000 });
  await expect(bar(page)).toContainText(`${db.q} questions`);
  await expect(bar(page)).toContainText(`${db.c} chunks`);
  console.log('after combobox:', (await bar(page).innerText()).replace(/\n/g, ' | '));
});
