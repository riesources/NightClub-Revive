// Quick visual check: node scripts/shot.mjs <outPrefix> [waitMs] [width] [height]
// Writes <outPrefix>-{club,dj,guest,build,dress,workers}.png
// Starts a set, lets guests arrive, and screenshots the club. Requires a build.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const [out = 'artifacts/shot', wait = '15000', w = '760', h = '600'] = process.argv.slice(2);
const PORT = 4180;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.log('pageerror', String(e)));
page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => window.__ncr?.game, null, { timeout: 15000 });
await page.evaluate(() => {
  window.__ncr.game.dismissTutorial();
  document.querySelector('.tutorial')?.remove();
  window.__ncr.game.startSet('pop');
});
await page.waitForTimeout(+wait);
const clearModals = () => page.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach((m) => m.remove()));
const click = async (sel) => {
  await clearModals();
  await page.click(sel);
};
await clearModals();
await page.screenshot({ path: `${out}-club.png` });
await click('.dock-btn[data-id="dj"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}-dj.png` });
await page.evaluate(() => {
  const g = window.__ncr.game.sim.guests.find((x) => x.state !== 'LEAVING');
  if (g) window.__ncr.ix.select({ kind: 'guest', id: g.id });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}-guest.png` });
await page.keyboard.press('Escape');
await click('.dock-btn[data-id="build"]');
await page.waitForTimeout(300);
await click('.cat[aria-label="Seating"]');
await page.hover('.item[data-id="sectional_red"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}-build.png` });
await click('.btn.ok >> text=Done');
await click('.dock-btn[data-id="dress"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}-dress.png` });
await page.click('.dressing-room .btn >> text=Cancel');
await click('.dock-btn[data-id="workers"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}-workers.png` });
await browser.close();
server.kill();
process.exit(0);
