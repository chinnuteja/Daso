/**
 * Evidence-only capture of Phase 8 surfaces and demo frames.
 * Not a product path. Playwright is not a package.json dependency.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
const playwrightHref =
  playwrightModule.includes(':') && !playwrightModule.startsWith('file:')
    ? pathToFileURL(
        playwrightModule.endsWith('.mjs') || playwrightModule.endsWith('.js')
          ? playwrightModule
          : `${playwrightModule}/index.mjs`,
      ).href
    : playwrightModule;
const { chromium } = await import(playwrightHref);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ASSETS = resolve(ROOT, 'docs/evidence/assets');
const FRAMES = resolve(ROOT, 'docs/demo/frames');
const FAIL = resolve(ASSETS, 'phase-08-capture-failure.png');
const BASE = process.env.TEACH_DASO_BASE_URL ?? 'http://localhost:3000';

async function click(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
}

async function recordThrow(page, design, distance, obstruction) {
  await page.locator('select[name="designName"]').selectOption(design);
  await page.locator('input[name="distanceM"]').fill(String(distance));
  const box = page.locator('input[name="obstruction"]');
  if (obstruction) {
    await box.check();
  } else {
    await box.uncheck();
  }
  await click(page, 'Record this throw');
}

async function shot(page, path, hideBadge = true) {
  if (hideBadge) {
    await page.addStyleTag({
      content: 'nextjs-portal, [data-next-badge-root] { display: none !important; }',
    });
  }
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  console.log(path);
}

const browser = await chromium.launch({
  channel: process.env.TEACH_DASO_BROWSER ?? 'chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1024, height: 1366 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Teach a tool from a real question.').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-home-empty.png'));
  await shot(page, resolve(FRAMES, '00-thesis.png'));

  await page.setViewportSize({ width: 320, height: 720 });
  await shot(page, resolve(ASSETS, 'phase-08-home-320.png'));
  await page.setViewportSize({ width: 768, height: 1024 });
  await shot(page, resolve(ASSETS, 'phase-08-home-768.png'));
  await page.setViewportSize({ width: 1024, height: 1366 });
  await shot(page, resolve(ASSETS, 'phase-08-home-1024.png'));

  await page.goto(`${BASE}/journey`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Local store is ready.').waitFor();
  await page.getByText('Question', { exact: true }).waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-imagine.png'));

  await click(page, 'I want to find out which paper airplane is best.');
  await click(page, 'Distance — how far it flies');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'Yes — also compare consistency');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'That’s what “best” means');
  await shot(page, resolve(FRAMES, '01-define.png'));
  await click(page, 'The plane’s name');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'How many metres it went');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'Yes — record obstruction');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'Don’t add a note field');
  await click(page, 'No — do not change the tool');
  await click(page, 'These are the things we write down');
  await click(page, 'I think Falcon will do best');
  await page.getByText('Go throw, then come back and write down what happened.').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-capture.png'));
  await recordThrow(page, 'Falcon', 7.4, false);
  await recordThrow(page, 'Glider', 5.8, false);
  await recordThrow(page, 'Dart', 6.1, false);
  await recordThrow(page, 'Dart', 8.9, true);
  await click(page, 'I have thrown enough');
  await click(page, 'This one looks different');
  await page.getByRole('button', { name: 'Review this suggestion' }).nth(0).click();
  await click(page, 'No — do not change the tool');
  await page.getByRole('button', { name: 'Review this suggestion' }).nth(1).click();
  await click(page, 'No — do not change the tool');
  await click(page, "That one shouldn't count because it hit the chair");
  await click(page, 'Review the rule I taught');
  await page.getByText('Maya said this.').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-approval.png'));
  await shot(page, resolve(FRAMES, '02-correction.png'));
  await click(page, 'Yes — add this to the tool');
  await page.getByText('Saved version: tool_version_002').waitFor();
  await page.getByText('Now: Falcon leads').waitFor();
  await page.getByText('Your words became a rule').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-compile.png'));
  await shot(page, resolve(FRAMES, '03-v2.png'));

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText("Maya's Flight Lab").waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-home-saved.png'));
  await click(page, 'Let Leo try this');
  await click(page, 'Make my copy');
  await page.getByText("Leo's copy of Maya's Flight Lab").waitFor();
  await page.getByText('Owner', { exact: true }).waitFor();
  await page.getByText('Leo', { exact: true }).waitFor();
  await page.getByText('Saved rules — works without AI').waitFor();
  await page.getByText('works from saved rules, without AI').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-runner.png'));
  await shot(page, resolve(FRAMES, '04-day-two.png'));

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Parent evidence' }).first().click();
  await page.getByText('What was noticed and taught').waitFor();
  await page.getByText('Ask Maya what made that throw unfair.').waitFor();
  await shot(page, resolve(ASSETS, 'phase-08-parent.png'));
  await shot(page, resolve(FRAMES, '05-parent.png'));

  await click(page, 'Delete this tool');
  await page.getByRole('button', { name: /Confirm delete/u }).waitFor();
  await page.getByRole('button', { name: /Confirm delete/u }).focus();
  await shot(page, resolve(ASSETS, 'phase-08-delete-focus.png'));
} catch (error) {
  await mkdir(dirname(FAIL), { recursive: true });
  await page.screenshot({ path: FAIL, fullPage: true }).catch(() => undefined);
  console.error(await page.locator('body').innerText().catch(() => ''));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
