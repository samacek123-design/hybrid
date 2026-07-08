/**
 * Screenshot driver for iteration passes.
 * Usage: node scripts/shoot.mjs <outDir> [flow]
 * Drives the app at localhost:8090 in headless Chrome at iPhone size,
 * walks the onboarding, logs sessions, and screenshots every screen.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:8090';
const outDir = process.argv[2] ?? 'shots';
const flow = process.argv[3] ?? 'all';
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0, 300));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await sleep(250);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('shot', name);
};

/** click the element whose visible text matches (case-insensitive) */
async function clickText(re, { last = false } = {}) {
  const ok = await page.evaluate(
    (src, flags, last) => {
      const re = new RegExp(src, flags);
      const nodes = [...document.querySelectorAll('div,span')].filter(
        (el) => re.test(el.textContent?.trim() ?? '') && el.children.length === 0,
      );
      const el = last ? nodes.at(-1) : nodes[0];
      if (!el) return false;
      let t = el;
      while (t && t !== document.body) {
        const style = getComputedStyle(t);
        if (style.cursor === 'pointer' || t.getAttribute('role') === 'button' || t.tabIndex >= 0) break;
        t = t.parentElement;
      }
      (t ?? el).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      (t ?? el).dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      (t ?? el).click();
      return true;
    },
    re.source,
    re.flags,
    last,
  );
  if (!ok) throw new Error(`clickText: no match for ${re}`);
  await sleep(350);
}

async function clickAll(re) {
  const n = await page.evaluate((src, flags) => {
    const re = new RegExp(src, flags);
    const nodes = [...document.querySelectorAll('div,span')].filter(
      (el) => re.test(el.textContent?.trim() ?? '') && el.children.length === 0,
    );
    for (const el of nodes) {
      let t = el;
      while (t && t !== document.body) {
        if (getComputedStyle(t).cursor === 'pointer' || t.getAttribute('role') === 'checkbox') break;
        t = t.parentElement;
      }
      (t ?? el).click();
    }
    return nodes.length;
  }, re.source, re.flags);
  await sleep(300);
  return n;
}

/** scroll the app's inner ScrollView (RN-web) */
async function scrollPage(y) {
  await page.evaluate((y) => {
    const scroller = [...document.querySelectorAll('div')].find(
      (d) => d.scrollHeight > d.clientHeight + 100 && d.clientHeight > 400,
    );
    if (scroller) scroller.scrollTop = y;
    else window.scrollTo(0, y);
  }, y);
  await sleep(400);
}

/** click every checkbox role element (set-done toggles) */
async function checkAllSets() {
  const n = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[role="checkbox"]')];
    boxes.forEach((b) => b.click());
    return boxes.length;
  });
  await sleep(300);
  return n;
}

// fresh state
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle2' });
await sleep(1200);

// --- onboarding walk ---
await shot('01-onboarding-intro');
await clickText(/start the block/i);
await shot('02-onboarding-goal');
await clickText(/next — frequency/i);
await shot('03-onboarding-frequency');
await clickText(/next — baselines/i);
await shot('04-onboarding-strength');
await clickText(/next — the road/i);
await shot('05-onboarding-cardio');
await clickText(/print my program/i);
await sleep(600);
await shot('06-onboarding-printing');
await sleep(1600);

// --- today ---
await shot('07-today-upper');
await scrollPage(4000);
await shot('07b-today-bottom');
await scrollPage(0);
const checked = await checkAllSets();
console.log('checked sets:', checked);
await shot('08-today-checked');
await scrollPage(4000);
await clickText(/complete session/i);
await sleep(700);
await shot('09-reward-moment');
await sleep(900);
await shot('10-reward-settled');
await clickText(/continue/i);
await sleep(500);

// log second session (lower) partially, third (run) via log-it
await checkAllSets();
await clickText(/complete session/i);
await sleep(1600);
await clickText(/continue/i);
await sleep(400);
await shot('11-today-cardio');
await clickText(/log it/i);
await shot('12-today-cardio-logged');
await clickText(/complete session/i);
await sleep(1000);
await shot('13-reward-cardio');
await clickText(/continue/i);
await sleep(400);

// second rotation round: heavier prescriptions → beat → PR expected
await checkAllSets();
await clickText(/complete session/i);
await sleep(1000);
await shot('14-reward-pr');
await clickText(/continue/i);
await sleep(300);

// --- other screens ---
await page.goto(`${BASE}/history`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('15-history');
await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('16-progress');
await scrollPage(9000);
await shot('17-progress-bottom');
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('18-profile');
await page.goto(`${BASE}/guide`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('19-guide-top');
await scrollPage(2400);
await shot('20-guide-mid');

// dark mode spot check
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('21-today-dark');
await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle2' });
await sleep(900);
await shot('22-progress-dark');

await browser.close();
console.log('done');
