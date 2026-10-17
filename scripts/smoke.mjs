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
  const gc = await page.evaluate(() => ({
    type: document.querySelector('.card-guest .guest-type')?.textContent ?? '',
    mood: document.querySelector('.card-guest .mood-word')?.textContent ?? '',
    stats: document.querySelectorAll('.card-guest .gstat').length,
    spent: document.querySelector('.card-guest .stats')?.textContent ?? '',
  }));
  check('guest card shows type, mood word, stat icons and spent', gc.type.length > 0 && gc.mood.length > 0 && gc.stats === 3 && gc.spent.includes('Spent'), JSON.stringify(gc));
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

  // Inventory: Store from the furniture card (no refund), then place it again from the Inventory tab for free
  await page.evaluate(() => {
    const g = window.__ncr.game;
    const palm = g.state.furniture.find((f) => f.catalogId === 'plant_palm');
    window.__ncr.ix.select({ kind: 'furniture', id: palm.id });
  });
  await page.waitForTimeout(300);
  await page.click('.card .btn >> text=Store');
  await click('.cat.inv');
  await click('.item.stored[data-id="plant_palm"]');
  const inv = await page.evaluate(() => {
    const { game, ix } = window.__ncr;
    const stored = game.state.inventory.plant_palm ?? 0;
    const mode = ix.mode;
    const c0 = game.state.cash;
    const e0 = game.state.totalEarned;
    const r = game.placeStored('plant_palm', 6, 7);
    return { stored, fromInventory: mode.kind === 'place' && mode.fromInventory === true, placed: r.ok, cost: c0 - game.state.cash + (game.state.totalEarned - e0), left: game.state.inventory.plant_palm ?? 0 };
  });
  check('Store moves an item to the inventory; the Inventory tab places it again for free', inv.stored === 1 && inv.fromInventory && inv.placed && inv.cost === 0 && inv.left === 0, JSON.stringify(inv));
  await page.keyboard.press('Escape');

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
  await page.click('.wslot.filled >> nth=0 >> .w-mode >> text=Tricks');
  check('Workers panel switches a bartender to Tricks', (await page.evaluate(() => window.__ncr.game.state.staff[0].mode)) === 'tricks');
  await page.click('.wslot.filled >> nth=1 >> .w-switch');
  const role = await page.evaluate(() => window.__ncr.game.state.staff[1]?.role);
  check('Workers panel switches a worker to Bouncer', role === 'bouncer');
  await page.screenshot({ path: `${SHOTS}/06-workers.png` });
  await page.click('.panel-tabbed .btn.ok');

  // The bouncer walks over to a troublemaker and escorts them out on his own
  const bouncerJob = await page.evaluate(async () => {
    const { game } = window.__ncr;
    const id = game.state.staff[1].id;
    const g = game.sim.spawn(game.state, Date.now());
    g.troublemaker = true;
    g.troubleAt = Date.now();
    let moved = false;
    const start = Date.now();
    while (Date.now() - start < 20000 && !g.escorted) {
      await new Promise((r) => setTimeout(r, 100));
      if (game.sim.bouncerAt(id)?.moving) moved = true;
    }
    return { escorted: g.escorted, moved };
  });
  check('a bouncer walks to a troublemaker in his area and escorts them out', bouncerJob.escorted && bouncerJob.moved, JSON.stringify(bouncerJob));

  // Celebrities: panel opens from the dock star and books a VIP
  await page.evaluate(() => {
    const { game } = window.__ncr;
    game.replaceState({ ...game.state, cash: game.state.cash + 5000, level: Math.max(1, game.state.level) });
  });
  await click('.dock-btn[data-id="celebs"]');
  // Guests keep paying while we click, so net out anything earned in between.
  const before = await page.evaluate(() => ({ cash: window.__ncr.game.state.cash, earned: window.__ncr.game.state.totalEarned }));
  await click('.celeb-card >> nth=0 >> .celeb-buy');
  const after = await page.evaluate(() => ({ b: window.__ncr.game.state.celebrity?.id, cash: window.__ncr.game.state.cash, earned: window.__ncr.game.state.totalEarned }));
  const charged = before.cash - after.cash + (after.earned - before.earned);
  check('Celebrities panel books a VIP and charges once', after.b === 'dj_nova' && charged === 1500, `charged $${charged}`);
  await page.screenshot({ path: `${SHOTS}/06b-celebrities.png` });
  await page.click('.celeb-panel .btn.corner');

  // Parties: planner opens from the dock, starts Neon Night, HUD pill appears
  await page.evaluate(() => {
    const { game } = window.__ncr;
    game.replaceState({ ...game.state, cash: game.state.cash + 1000 });
  });
  await click('.disco-ball');
  const pBefore = await page.evaluate(() => ({ cash: window.__ncr.game.state.cash, earned: window.__ncr.game.state.totalEarned }));
  await click('.party-card[data-party="neon_night"] >> .btn');
  const pAfter = await page.evaluate(() => ({ p: window.__ncr.game.state.party?.id, cash: window.__ncr.game.state.cash, earned: window.__ncr.game.state.totalEarned }));
  const pCharged = pBefore.cash - pAfter.cash + (pAfter.earned - pBefore.earned);
  await page.waitForTimeout(1200);
  const pill = await page.locator('.party-cta.on').count();
  check('THROW A PARTY! opens the planner, starts a party, charges once, shows the countdown', pAfter.p === 'neon_night' && pCharged === 500 && pill === 1, `charged $${pCharged}, pill ${pill}`);
  await page.screenshot({ path: `${SHOTS}/06c-party.png` });
  await page.click('.party-panel .btn.corner');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/06d-party-club.png` });

  // Top-right club name renames inline; Wish marks a celebrity; now playing shows the end time
  await page.click('.club-name');
  await page.fill('.club-name-input', 'Smoke Club');
  await page.keyboard.press('Enter');
  await click('.dock-btn[data-id="celebs"]');
  await click('.celeb-card >> nth=0 >> .celeb-wish');
  await page.click('.celeb-panel .btn.corner');
  const iface = await page.evaluate(() => ({
    name: window.__ncr.game.state.clubName,
    label: document.querySelector('.club-name')?.textContent,
    wishes: window.__ncr.game.state.celebWishes,
    ends: document.querySelector('.np-ends')?.textContent ?? '',
  }));
  check('club name renames, Wish saves, now playing shows "Ends: <time>"', iface.name === 'Smoke Club' && iface.label === 'Smoke Club' && iface.wishes.length === 1 && /^Ends: \d{1,2}:\d\d(am|pm)$/.test(iface.ends), JSON.stringify(iface));

  // Four-way rotation: a sofa turns through all four facings in place
  const rot = await page.evaluate(() => {
    const g = window.__ncr.game;
    g.replaceState({ ...g.state, level: Math.max(1, g.state.level), cash: g.state.cash + 2000 });
    if (!g.buy('sofa_red', 2, 7).ok) return { ok: false };
    const id = g.state.furniture.at(-1).id;
    const seen = [];
    for (let i = 0; i < 4; i++) {
      const cur = g.state.furniture.find((f) => f.id === id);
      g.move(id, cur.col, cur.row, (cur.facing + 1) % 4);
      seen.push(g.state.furniture.find((f) => f.id === id).facing);
    }
    return { ok: true, seen };
  });
  check('furniture rotates through all four directions', rot.ok && rot.seen.join(',') === '1,2,3,0', JSON.stringify(rot));

  // Seating: a guest who reaches a sofa sits on it (on the seat, sitting pose)
  const sit = await page.evaluate(async () => {
    const { game } = window.__ncr;
    game.replaceState({ ...game.state, level: Math.max(3, game.state.level), cash: game.state.cash + 6000 });
    if (!game.buy('sofa_round_red', 3, 8).ok) return { ok: false };
    const seat = game.state.furniture.at(-1);
    const g = game.sim.spawn(game.state, Date.now());
    g.troublemaker = false;
    g.seatId = seat.id;
    g.state = 'SEEKING_SEAT';
    g.path = [];
    g.x = seat.col - 0.5;
    g.y = seat.row + 0.5;
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, sitting: g.sitting, onSeat: Math.floor(g.x) >= seat.col && Math.floor(g.y) >= seat.row };
  });
  check('guests sit on sofas', sit.ok && sit.sitting && sit.onSeat, JSON.stringify(sit));

  // More music: six mixes, each with a named track playlist and a Next button
  const mus = await page.evaluate(async () => {
    const { music } = window.__ncr;
    const mixes = document.querySelectorAll('.mix').length;
    music.unlock();
    music.play('house');
    const a = music.track?.name;
    music.skip();
    const b = music.track?.name;
    return { a, b, count: music.track?.count };
  });
  check('music: tracks play as a set and Next moves to the next track', !!mus.a && !!mus.b && mus.a !== mus.b && mus.count >= 3, JSON.stringify(mus));

  // Progress screen: opens from the level badge, highlights the current level, shows what's next
  await click('.level-badge');
  const prog = await page.evaluate(() => {
    const lvl = window.__ncr.game.state.level;
    const cur = document.querySelector('.pg-row.current');
    return { lvl, cur: cur?.getAttribute('data-level'), rows: document.querySelectorAll('.pg-row').length, next: !!document.querySelector('.pg-next .unlock-chip') };
  });
  check('Progress screen shows the ladder, current level and next unlocks', prog.cur === String(prog.lvl) && prog.rows >= 22 && prog.next, JSON.stringify(prog));
  await page.screenshot({ path: `${SHOTS}/06e-progress.png` });
  await page.click('.progress-panel .btn.corner');

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
