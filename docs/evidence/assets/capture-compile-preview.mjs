/**
 * Evidence-only capture of the real /journey compile preview after v2.
 * Not a product path. Playwright is not a package.json dependency.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(playwrightModule);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = resolve(ROOT, 'docs/evidence/assets/phase-05-compile-preview-v2.png');
const FAIL = resolve(ROOT, 'docs/evidence/assets/phase-05-compile-preview-failure.png');
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

const profile = mkdtempSync(join(tmpdir(), 'teach-daso-evidence-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: process.env.TEACH_DASO_BROWSER ?? 'msedge',
  headless: true,
  viewport: { width: 1024, height: 1366 },
});
const page = context.pages()[0] ?? (await context.newPage());
page.setDefaultTimeout(20_000);
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
  await page.getByText('exclude_obstructed_flight').waitFor();
  await page.getByText('Winner now: Falcon').waitFor();
  await page.getByText('trial_004').waitFor();
  await page.getByText('Before, Dart was first.').waitFor();
  await page.getByText('Now Falcon is first.').waitFor();

  await page.addStyleTag({
    content: 'nextjs-portal, [data-next-badge-root] { display: none !important; }',
  });
  await mkdir(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: true });
  console.log(OUT);
} catch (error) {
  await mkdir(dirname(FAIL), { recursive: true });
  await page.screenshot({ path: FAIL, fullPage: true }).catch(() => undefined);
  console.error(await page.locator('body').innerText().catch(() => ''));
  throw error;
} finally {
  await context.close();
}
