/* ── Statistics test runner ──
 *
 * 1. Generates practice problems from the nine student modules (seeded).
 * 2. Has SciPy recompute every answer key      → tests/check_student.py
 * 3. Has SciPy recompute the Python engine's output → tests/check_engine.py
 *
 * Usage: npm test            (needs python3 with numpy, scipy and pandas)
 *        npm test -- 5000    (problems per module; default 2000)
 *        SEED=7 npm test     (different random problems)
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here   = dirname(fileURLToPath(import.meta.url));
const python = process.env.PYTHON ?? 'python3';
const count  = process.argv[2] ?? '2000';
const seed   = process.env.SEED ?? '20261117';

const dir  = mkdtempSync(join(tmpdir(), 'statteacher-'));
const file = join(dir, 'problems.json');
let failed = false;

function step(title, cmd, args, opts = {}) {
  console.log(`\n── ${title} ──`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) console.error(`Could not run ${cmd}: ${res.error.message}`);
  if (res.status !== 0) failed = true;
  return res.status === 0;
}

try {
  const out = openSync(file, 'w');
  const generated = step(`Generating ${count} problems per student module (seed ${seed})`,
    process.execPath, [join(here, 'generate.mjs'), count, seed], { stdio: ['ignore', out, 'inherit'] });
  closeSync(out);

  if (generated) step('Student answer keys vs SciPy', python, [join(here, 'check_student.py'), file]);
  step('Python engine vs SciPy', python, [join(here, 'check_engine.py')]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? '\nFAILED' : '\nAll statistics checks passed.');
process.exit(failed ? 1 : 0);
