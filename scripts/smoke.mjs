// Browser smoke test: builds must exist (npm run build). Drives the real app in
// headless Chromium and fails on console errors or broken core flows.
// Usage: node scripts/smoke.mjs [--shots <dir>]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : 'artifacts';
mkdirSync(SHOTS, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
};

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => {
    // The helper CSS page used for the corrupt-save check triggers the browser's
    // automatic /favicon.ico request; the app itself uses an inline icon.
    if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(`${m.text()} @ ${m.location().url}`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL);
  await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  check('app boots and removes loading screen', true);
  check('tutorial shows on first run', (await page.locator('.tutorial').count()) === 1);
  await page.screenshot({ path: `${SHOTS}/01-first-run.png` });
  await page.click('.tutorial .btn');

  // DJ: start a set
  await page.click('.dock-btn[data-id="dj"]');
  await page.click('.genre >> text=Hip-Hop');
  const playing = await page.evaluate(() => window.__ncr.game.state.dj.setEndsAt !== null);
  check('DJ set starts from the DJ panel', playing);
  await page.waitForTimeout(20000);
  const live = await page.evaluate(() => ({
    guests: window.__ncr.game.sim.guests.length,
    sold: window.__ncr.game.state.stats.drinksSold,
    illegal: window.__ncr.game.sim.illegalTransitions,
  }));
  check('guests arrive', live.guests > 2, `${live.guests} guests`);
  check('no illegal guest state transitions', live.illegal === 0);
  await page.screenshot({ path: `${SHOTS}/02-club-running.png` });

  // Drop the Bass
  await page.click('.dj-actions .btn >> text=Drop the Bass');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SHOTS}/03-drop-the-bass.png` });

  // Build: invalid placement must not charge, valid one charges once
  await page.click('.dock-btn[data-id="build"]');
  await page.click('.tab >> text=Decor');
  await page.click('.card >> text=Potted Palm');
  const before = await page.evaluate(() => window.__ncr.game.state.cash);
  const bad = await page.evaluate(() => window.__ncr.game.buy('plant_palm', -3, -3).ok);
  const afterBad = await page.evaluate(() => window.__ncr.game.state.cash);
  check('invalid placement does not charge', !bad && afterBad === before);
  await page.mouse.move(640, 420);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/04-build-mode.png` });
  await page.keyboard.press('Escape');
  const placed = await page.evaluate(() => {
    const g = window.__ncr.game;
    const c0 = g.state.cash;
    const r = g.buy('plant_palm', 11, 5);
    return { ok: r.ok, delta: c0 - g.state.cash };
  });
  check('valid placement charges exactly once', placed.ok && placed.delta === 120, JSON.stringify(placed));

  // Dressing room: cancel does not persist, save does
  await page.click('.dock-btn[data-id="dress"]');
  await page.click('.dr-tabs .tab >> text=Hair Style');
  await page.click('.dr-opt >> text=afro');
  await page.screenshot({ path: `${SHOTS}/05-dressing-room.png` });
  await page.click('.dressing-room .btn >> text=Cancel');
  const afterCancel = await page.evaluate(() => window.__ncr.game.state.appearance.hairStyle);
  check('dressing room cancel does not persist', afterCancel !== 'afro');
  await page.click('.dock-btn[data-id="dress"]');
  await page.click('.dr-tabs .tab >> text=Hair Style');
  await page.click('.dr-opt >> text=afro');
  await page.click('.dressing-room .btn >> text=Save');

  // Save -> reload -> compare
  await page.waitForTimeout(800);
  const snap = await page.evaluate(() => {
    const s = window.__ncr.game.state;
    return JSON.stringify({ cash: s.cash, furniture: s.furniture, appearance: s.appearance, stock: s.stock, xp: s.xp, dj: s.dj, staff: s.staff });
  });
  await page.reload();
  await page.waitForFunction(() => window.__ncr?.game, null, { timeout: 15000 });
  const reloaded = await page.evaluate(() => {
    const s = window.__ncr.game.state;
    return JSON.stringify({ cash: s.cash, furniture: s.furniture, appearance: s.appearance, stock: s.stock, xp: s.xp, dj: s.dj, staff: s.staff });
  });
  check('save -> reload preserves cash, layout, appearance, stock, XP, DJ, staff', snap === reloaded);
  check('tutorial stays dismissed after reload', (await page.locator('.tutorial').count()) === 0);

  // Corrupt save recovery
  // Plant the corrupt save from a static same-origin page, so the app's own
  // pagehide autosave cannot overwrite it before the next load.
  const cssHref = await page.evaluate(() => document.querySelector('link[rel=stylesheet]')?.getAttribute('href'));
  await page.goto(new globalThis.URL(cssHref, URL).href);
  await page.evaluate(() => localStorage.setItem('nightclub-revive.save', '{"schemaVersion":1,"cash":"lots"'));
  await page.goto(URL);
  await page.waitForFunction(() => window.__ncr?.game, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  const notice = await page.locator('.modal-title >> text=could not be loaded').count();
  const backup = await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('nightclub-revive.save.corrupt.')));
  check('corrupt save shows a notice and keeps a backup', notice === 1 && backup);
  await page.screenshot({ path: `${SHOTS}/06-corrupt-save.png` });

  // Mobile width
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/07-mobile.png` });

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('smoke run completed', false, String(e));
} finally {
  await browser?.close();
  server.kill();
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
