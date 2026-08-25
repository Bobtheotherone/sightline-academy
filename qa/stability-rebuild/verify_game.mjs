// Drives the rebuilt stability game end to end through the PUBLIC site and
// screenshots every state. Usage:
//   /usr/lib/chatgpt/resources/cua_node/bin/node verify_game.mjs [reduced]
import { chromium } from '/home/rnmercado/Projects/Sightline_Saftey_Academy/web/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';

const SP = '/tmp/claude-1000/-home-rnmercado-Projects-Sightline-Saftey-Academy/10d57e09-47dc-4d87-810c-8a78747c1de4/scratchpad';
const B = 'https://unfixable-escapade-democrat.ngrok-free.dev';
const reduced = process.argv.includes('reduced');
const tag = reduced ? 'rm' : 'anim';
const email = (process.env.EMAIL || readFileSync(`${SP}/lab_email`, 'utf8')).trim();

const b = await chromium.launch({ executablePath: '/home/rnmercado/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome' });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 1100 },
  extraHTTPHeaders: { 'ngrok-skip-browser-warning': '1' },
  reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

await p.goto(B + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.fill('input[type="email"]', email);
await p.fill('input[type="password"]', 'TrailRider2026!x');
await p.click('button[type="submit"]');
await p.waitForURL('**/dashboard', { timeout: 60000 });
await p.goto(B + '/learn/m4-l2-stability', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(1500);

const clearVeil = async () => {
  const v = p.locator('div[role="status"][aria-label^="Next section"]');
  for (let n = 0; n < 12 && await v.count(); n++) { await v.first().click({ force: true }).catch(() => {}); await p.waitForTimeout(400); }
};
// On revisit the lesson opens on the last step read — go straight to the lab via the rail.
await clearVeil();
const railLab = p.locator('text=/stability explorer/i').filter({ visible: true }).first();
if (await railLab.count()) { await railLab.click({ force: true }).catch(() => {}); await p.waitForTimeout(1200); await clearVeil(); }
for (let i = 0; i < 4; i++) {
  await clearVeil();
  const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  if (/lab objectives/i.test(t)) break;   // the eyebrow is uppercased by CSS; innerText follows it
  const nxt = p.locator('button:has-text("Continue")').first();
  if (!(await nxt.count())) break;
  await nxt.click({ force: true }).catch(() => {}); await p.waitForTimeout(1500); await clearVeil();
}

const lab = p.locator('section[aria-label="Lab objectives"]').locator('..');
const shot = async (n) => { await lab.screenshot({ path: `${SP}/shots/game-${tag}-${n}.png` }); };
const vshot = async (n) => { await p.screenshot({ path: `${SP}/shots/game-${tag}-${n}-vp.png` }); };
const bodyText = async () => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const objectives = async () => ((await bodyText()).match(/\d of 4 met/) || ['?'])[0];
const setRange = async (loc, v) => {
  await loc.evaluate((el, val) => {
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await p.waitForTimeout(250);
};
// The stage has no pose attribute any more: a run is over when the verdict strip
// appears (the sim contains the tumble; the banner lands on the last frame).
const waitSettled = async () => {
  for (let i = 0; i < 120; i++) {
    const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    if (/You made it|The machine rolled|You came off|The run did not start/.test(t)) return 'settled';
    await p.waitForTimeout(200);
  }
  return 'TIMEOUT';
};
const verdict = async () => ((await bodyText()).match(/You made it|The machine rolled|You came off|Good instinct|turned back/i) || ['?'])[0];

process.on('unhandledRejection', async (e) => {
  console.log('FAILED:', String(e).split('\n')[0]);
  try {
    await p.screenshot({ path: `${SP}/shots/game-${tag}-ERROR.png` });
    console.log('buttons now:', (await p.locator('button').allInnerTexts()).map(t => t.trim()).filter(Boolean).slice(0, 20));
    console.log('pose now   :', await p.locator('svg[data-pose]').first().getAttribute('data-pose').catch(() => 'none'));
  } catch {}
  process.exit(1);
});
console.log(`[${tag}] start:`, await objectives());
await shot('0-start');

const pick = async (name) => {
  const card = p.getByRole('button', { name: new RegExp(name, 'i') }).first();
  await card.click(); await p.waitForTimeout(400);
};
const lean = () => p.locator('#stab-lean');   // never the scrubber, which precedes it in the DOM once a run exists
const play = async () => { await p.getByRole('button', { name: /play the run|^play$/i }).first().click(); };
// Stage-only captures during a run, at the given delays after Play (ms).
const burst = async (name, delays) => {
  const t0 = Date.now();
  for (const d of delays) {
    const wait = t0 + d - Date.now(); if (wait > 0) await p.waitForTimeout(wait);
    await p.locator('svg[data-stage="stability"]').first().screenshot({ path: `${SP}/shots/game-${tag}-${name}-t${d}.png` }).catch(() => {});
  }
};
const again = async () => { const a = p.getByRole('button', { name: /try again/i }).first(); if (await a.count()) await a.click(); await p.waitForTimeout(300); };

// 1. traverse: centred → rollover; uphill lean → clean
await pick('traverse');
await play(); await burst('1-traverse', [2500, 3800, 4300, 4800, 5300, 6200]); console.log('traverse centred   ->', await waitSettled(), '|', await verdict());
await shot('1-traverse-fail'); await vshot('1-traverse-fail');
await again();
await setRange(lean(), -70); await play(); console.log('traverse lean -70  ->', await waitSettled(), '|', await verdict(), '|', await objectives());
await shot('2-traverse-clean');

// 2. haul: centred → rider off; forward lean → clean
await pick('haul');
await play(); await burst('3-haul', [2000, 3000, 4000, 5000, 6000]); console.log('haul centred       ->', await waitSettled(), '|', await verdict());
await shot('3-haul-fail');
await again();
await setRange(lean(), -60); await play(); console.log('haul lean -60      ->', await waitSettled(), '|', await verdict(), '|', await objectives());
await shot('4-haul-clean');

// 3. descent: forward lean → over bars; back lean → clean
await pick('descent|drop');
await setRange(lean(), 60); await play(); console.log('descent lean +60   ->', await waitSettled(), '|', await verdict());
await shot('5-descent-fail');
await again();
await setRange(lean(), -60); await play(); console.log('descent lean -60   ->', await waitSettled(), '|', await verdict(), '|', await objectives());
await shot('6-descent-clean');

// 4. shortcut: full lean standing → still fails; turn back → cleared
await pick('shortcut');
const standing = p.getByRole('button', { name: /standing/i }).first(); if (await standing.count()) await standing.click();
await setRange(lean(), -100); await play(); console.log('shortcut max setup ->', await waitSettled(), '|', await verdict());
await shot('7-shortcut-fail'); await vshot('7-shortcut-fail');
await p.getByRole('button', { name: /turn back/i }).first().click(); await p.waitForTimeout(600);
console.log('shortcut turn back ->', await verdict(), '|', await objectives());
await shot('8-shortcut-turnback');

const tab = p.getByRole('tab', { name: /free tilt/i }).first();
console.log('free tilt tab      :', await tab.count());
if (await tab.count()) { await tab.click(); await p.waitForTimeout(900); await shot('9-freetilt'); await p.getByRole('tab', { name: /scenario runs/i }).first().click(); await p.waitForTimeout(400); }
const about = p.getByRole('button', { name: /about this simulation/i }).first();
if (await about.count()) { await about.click(); await p.waitForTimeout(500);
  console.log('popover           :', (await p.locator('[data-radix-popper-content-wrapper]').first().innerText().catch(() => '(none)')).replace(/\s+/g, ' ').slice(0, 420)); await p.keyboard.press('Escape'); }
console.log('scrubber           :', await p.locator('#stab-scrub').count());
console.log('stage svg          :', await p.locator('svg[data-stage="stability"]').count(), '| sprites:', await p.locator('[data-stage="atv-side"], [data-stage="atv-rear"]').count());
console.log('page/console errors:', errs.length ? errs.slice(0, 5) : 'none');
console.log('final              :', await objectives());
// mobile layout: does the lab stack sensibly at phone width?
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(800);
await p.getByRole('button', { name: /traverse/i }).first().click().catch(() => {}); await p.waitForTimeout(500);
await lab.screenshot({ path: `${SP}/shots/game-${tag}-mobile.png` }).catch(() => {});
console.log('mobile shot        : taken');
await b.close();
