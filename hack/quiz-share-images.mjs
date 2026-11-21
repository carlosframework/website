// 🤖 Renders the quiz's three share images (src/uncompromising/share/{all,most,few}.png, 1200 x 630) from the copy and
// the character, with a local headless Chrome. Run it again after a copy review changes a verdict, the question or
// "Take the test", or after the character changes:
//   node hack/quiz-share-images.mjs /path/to/chrome
// Scratch goes under $TMPDIR (on disk on the shared machines), never the build.
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { shareHTML } from './quiz-pictures.mjs';
import { loadQuizCopy, quizText } from './build-quiz.mjs';

const chrome = process.argv[2] || process.env.QUIZ_CHROME;
if (!chrome) { console.error('usage: node hack/quiz-share-images.mjs /path/to/chrome'); process.exit(2); }
const t = quizText(await loadQuizCopy());
const dir = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'quiz-share-'));
try {
  await mkdir('src/uncompromising/share', { recursive: true });
  for (const kind of ['all', 'most', 'few']) {
    const page = join(dir, `${kind}.html`), shot = join(dir, `${kind}.png`);
    await writeFile(page, shareHTML(t, kind));
    execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${join(dir, 'profile')}`,
      '--window-size=1200,630', '--force-device-scale-factor=1', `--screenshot=${shot}`, `file://${page}`], { stdio: 'pipe' });
    await copyFile(shot, `src/uncompromising/share/${kind}.png`);
    console.log(`src/uncompromising/share/${kind}.png`);
  }
} finally { await rm(dir, { recursive: true, force: true }); }
