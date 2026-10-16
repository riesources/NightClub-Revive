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
  browser = await chromium.launch({ executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
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
  await page.click('.tutorial .guide-next');
  check('tutorial pages forward', (await page.locator('.guide-title').textContent()) === 'Your DJ set');
  await page.click('.tutorial .guide-skip');
  // Level-up popups are real game events; dismiss them so they don't block later clicks.
  const dismiss = () => page.evaluate(() => document.querySelectorAll('.levelup').forEach((m) => m.closest('.modal-backdrop')?.remove()));
  const click = async (sel) => {
    await dismiss();
    await page.click(sel);
  };

  // DJ: start a set
  await click('.dock-btn[data-id="dj"]');
  await click('.dj-row >> text=Refresh Set');
  await click('.mix >> text=Hip-Hop Mix');
  const playing = await page.evaluate(() => window.__ncr.game.state.dj.setEndsAt !== null);
  check('DJ set starts from the DJ card (Refresh Set -> mix)', playing);
  await page.waitForTimeout(500);
  check('procedural music follows the set genre', (await page.evaluate(() => window.__ncr.music.playing)) === 'hiphop');
  await page.waitForTimeout(20000);
  const live = await page.evaluate(() => ({
    guests: window.__ncr.game.sim.guests.length,
    sold: window.__ncr.game.state.stats.drinksSold,
    illegal: window.__ncr.game.sim.illegalTransitions,
    earned: window.__ncr.game.state.totalEarned,
  }));
  check('guests arrive and pay the cover charge', live.guests > 2 && live.earned >= 5 * 3, `${live.guests} guests, $${live.earned} earned`);
  check('no illegal guest state transitions', live.illegal === 0);
  await page.screenshot({ path: `${SHOTS}/02-club-running.png` });

  // Drop Bass from the DJ card
  await dismiss();
  await page.evaluate(() => window.__ncr.ix.select(null));
  await click('.dock-btn[data-id="dj"]');
  await click('.dj-row >> text=Drop Bass');
  check('Drop Bass starts its cooldown', (await page.evaluate(() => window.__ncr.game.state.dj.lastDropBassAt)) !== null);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SHOTS}/03-drop-the-bass.png` });

  // Build: invalid placement must not charge, valid one charges once
  // Guest card
  await dismiss();
  await page.evaluate(() => {
    const g = window.__ncr.game.sim.guests[0];
    window.__ncr.ix.select({ kind: 'guest', id: g.id });
  });
  await page.waitForTimeout(400);
  check('guest card shows spent / tip rate / happiness', (await page.locator('.card-guest .stats').textContent())?.includes('Tip Rate') === true);
  await page.keyboard.press('Escape');

  await click('.dock-btn[data-id="build"]');
  await click('.cat[aria-label="Decor"]');
  await click('.item[data-id="plant_palm"]');
  // One evaluate = one JS task, so no simulation tick can credit cash in between.
  const invalid = await page.evaluate(() => {
    const g = window.__ncr.game;
    const before = g.state.cash;
    const ok = g.buy('plant_palm', -3, -3).ok;
    return { ok, delta: g.state.cash - before };
  });
  check('invalid placement does not charge', !invalid.ok && invalid.delta === 0);
  await page.mouse.move(640, 420);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/04-build-mode.png` });
  await page.keyboard.press('Escape');
  const placed = await page.evaluate(() => {
    const g = window.__ncr.game;
    const c0 = g.state.cash;
    const r = g.buy('plant_palm', 5, 7);
    return { ok: r.ok, delta: c0 - g.state.cash };
  });
  check('valid placement charges exactly once', placed.ok && placed.delta === 250, JSON.stringify(placed));

  // Dressing room: cancel does not persist, save does
  await click('.btn.ok >> text=Done');
  await click('.dock-btn[data-id="dress"]');
  await click('.dr-item[aria-label="Hair afro"]');
  await page.screenshot({ path: `${SHOTS}/05-dressing-room.png` });
  await page.click('.dressing-room .btn >> text=Cancel');
  const afterCancel = await page.evaluate(() => window.__ncr.game.state.appearance.hairStyle);
  check('dressing room cancel does not persist', afterCancel !== 'afro');
  await click('.dock-btn[data-id="dress"]');
  await click('.dr-item[aria-label="Hair afro"]');
  await page.click('.dressing-room .btn.ok');

  // Workers: hire fills the second open slot, then no more slots at low level
  await click('.dock-btn[data-id="workers"]');
  const before2 = await page.evaluate(() => window.__ncr.game.state.staff.length);
  await click('.wslot.open .btn');
  const after2 = await page.evaluate(() => window.__ncr.game.state.staff.length);
  check('Workers panel hires into an open slot; higher slots stay locked', after2 === before2 + 1 && (await page.locator('.wslot.locked').count()) === 4);
  await page.screenshot({ path: `${SHOTS}/06-workers.png` });
  await page.click('.panel-tabbed .btn.ok');

  // Save -> reload -> compare. Freeze the simulation first: guests keep paying
  // cover/drinks, which would otherwise change state between snapshot and reload.
  await page.evaluate(() => {
    window.__ncr.game.tick = () => {};
  });
  await page.waitForTimeout(800);
  const pick = () =>
    page.evaluate(() => {
      const s = window.__ncr.game.state;
      return { cash: s.cash, earned: s.totalEarned, xp: s.xp, drinks: s.stock.drinks, fixed: JSON.stringify({ furniture: s.furniture, appearance: s.appearance, dj: s.dj, staff: s.staff, level: s.level }) };
    });
  const snap = await pick();
  await page.reload();
  await page.waitForFunction(() => window.__ncr?.game, null, { timeout: 15000 });
  const reloaded = await pick();
  // The reloaded club starts simulating immediately (a guest may pay cover before we read it),
  // so economy fields must match up to new earnings, and everything else exactly.
  const dCash = reloaded.cash - snap.cash;
  const dEarned = reloaded.earned - snap.earned;
  const sameEconomy = dCash === dEarned && dCash >= 0 && dCash < 100 && reloaded.xp - snap.xp === dEarned && reloaded.drinks <= snap.drinks;
  if (!(sameEconomy && snap.fixed === reloaded.fixed)) console.log('DIFF', JSON.stringify(snap).slice(0, 300), JSON.stringify(reloaded).slice(0, 300));
  check('save -> reload preserves layout, appearance, DJ, staff, level; cash/XP/stock match up to new earnings', sameEconomy && snap.fixed === reloaded.fixed, `+$${dCash} earned after reload`);
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
  await page.screenshot({ path: `${SHOTS}/07-corrupt-save.png` });

  // Mobile width
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/08-mobile.png` });

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
