import { chromium } from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const DIR = "/tmp/claude-1000/-home-rnmercado-Projects-Sightline-Saftey-Academy/10d57e09-47dc-4d87-810c-8a78747c1de4/scratchpad/harness2";
const OUT = path.join(DIR, "out");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/home/rnmercado/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
await page.goto("file://" + path.join(DIR, "page.html"));
await page.waitForTimeout(400);

const ids = await page.$$eval(".cell", (els) => els.map((e) => e.id));
for (const id of ids) {
  const el = await page.$(`[id="${id}"]`);
  await el.screenshot({ path: path.join(OUT, `${id}.png`) });
}
await page.screenshot({ path: path.join(OUT, "_sheet.png"), fullPage: true });
console.log("shot", ids.join(" "));
await browser.close();
