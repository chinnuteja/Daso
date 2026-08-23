/**
 * Evidence-only capture of the real parent-evidence screen and post-delete Home.
 * Not a product path. Playwright is not a package.json dependency.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
const playwrightHref = playwrightModule.includes(':') && !playwrightModule.startsWith('file:')
  ? pathToFileURL(
      playwrightModule.endsWith('.mjs') || playwrightModule.endsWith('.js')
        ? playwrightModule
        : `${playwrightModule}/index.mjs`,
    ).href
  : playwrightModule;
const { chromium } = await import(playwrightHref);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PARENT = resolve(ROOT, 'docs/evidence/assets/phase-07-parent-evidence.png');
const DELETED = resolve(ROOT, 'docs/evidence/assets/phase-07-deletion-proof.png');
const FAIL = resolve(ROOT, 'docs/evidence/assets/phase-07-capture-failure.png');
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

const browser = await chromium.launch({
  channel: process.env.TEACH_DASO_BROWSER ?? 'chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1024, height: 1366 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.on('pageerror', (error) => {
  console.error('pageerror', error);
});

try {
  await page.goto(`${BASE}/journey`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Local store is ready.').waitFor();

  await click(page, 'I want to find out which paper airplane is best.');
  await click(page, 'Distance — how far it flies');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'Yes — also compare consistency');
  await click(page, 'Yes — add this to the tool');
  await click(page, 'That’s what “best” means');
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
  await click(page, 'Yes — add this to the tool');
  await page.getByText('Saved version: tool_version_002').waitFor();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText("Maya's Flight Lab").waitFor();
  await click(page, 'Let Leo try this');
  await click(page, 'Make my copy');
  await page.getByText("Leo's copy of Maya's Flight Lab").waitFor();
  await page.getByText('Inherited from Maya').waitFor();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Parent evidence' }).first().click();
  await page.getByText('What Maya taught').waitFor();
  await page.getByText('trial_004').waitFor();
  await page.getByText('event_014').waitFor();
  await page.getByText('tool_version_002').waitFor();
  await page.getByText('Ask Maya what made that throw unfair.').waitFor();
  await page.getByText('Stored on this tablet.').waitFor();
  await page.getByText('Delivery of the summary to a parent by SMS or push notification.').waitFor();

  await page.addStyleTag({
    content: 'nextjs-portal, [data-next-badge-root] { display: none !important; }',
  });
  await mkdir(dirname(PARENT), { recursive: true });
  await page.screenshot({ path: PARENT, fullPage: true });
  console.log(PARENT);

  await click(page, 'Delete Maya’s local profile');
  await click(page, 'Confirm delete Maya’s local profile');
  await page.getByText('That local profile and every tool it owned were removed from this tablet.').waitFor();
  await page.getByText('A copied tool').waitFor();
  await page.getByText('Inherited from a profile that was deleted', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('That local profile and every tool it owned were removed from this tablet.').waitFor();
  await page.getByText('A copied tool').waitFor();
  await page.getByText('Inherited from a profile that was deleted', { exact: true }).waitFor();

  await page.addStyleTag({
    content: 'nextjs-portal, [data-next-badge-root] { display: none !important; }',
  });
  await mkdir(dirname(DELETED), { recursive: true });
  await page.screenshot({ path: DELETED, fullPage: true });
  console.log(DELETED);
} catch (error) {
  await mkdir(dirname(FAIL), { recursive: true });
  await page.screenshot({ path: FAIL, fullPage: true }).catch(() => undefined);
  console.error(await page.locator('body').innerText().catch(() => ''));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
