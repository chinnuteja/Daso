import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(DEMO_DIR, '../..');
const manifest = JSON.parse(await readFile(join(DEMO_DIR, 'manifest.json'), 'utf8'));
const output = resolve(REPO_ROOT, manifest.video);
const ffmpeg = await findPlaywrightFfmpeg();

const encoder = spawn(
  ffmpeg,
  [
    '-y',
    '-f',
    'image2pipe',
    '-r',
    '1',
    '-vcodec',
    'mjpeg',
    '-i',
    'pipe:0',
    '-vf',
    'scale=1024:1366:force_original_aspect_ratio=decrease,pad=1024:1366:(ow-iw)/2:(oh-ih)/2:color=#f3f0e7',
    '-c:v',
    'libvpx',
    '-b:v',
    '2M',
    '-r',
    '30',
    '-f',
    'webm',
    output,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

for (const frame of manifest.frames) {
  const image = await sharp(await readFile(resolve(REPO_ROOT, frame.file)))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
  for (let second = 0; second < frame.durationSeconds; second += 1) {
    if (!encoder.stdin.write(image)) {
      await once(encoder.stdin, 'drain');
    }
  }
}
encoder.stdin.end();

const [exitCode] = await once(encoder, 'exit');
if (exitCode !== 0) {
  throw new Error(`Demo encoder exited with ${String(exitCode)}`);
}

console.log(output);

async function findPlaywrightFfmpeg() {
  if (process.env.PLAYWRIGHT_FFMPEG !== undefined) {
    return process.env.PLAYWRIGHT_FFMPEG;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData === undefined) {
    throw new Error('Set PLAYWRIGHT_FFMPEG to the local Playwright ffmpeg binary.');
  }
  const cache = join(localAppData, 'ms-playwright');
  const candidates = (await readdir(cache, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('ffmpeg-'))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const selected = candidates[0];
  if (selected === undefined) {
    throw new Error('No Playwright ffmpeg cache was found.');
  }
  return join(cache, selected, 'ffmpeg-win64.exe');
}
