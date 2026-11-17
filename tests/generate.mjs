/* ── Generate student practice problems as JSON ──
 *
 * Loads each student module through Vite (so the TypeScript runs unmodified),
 * replaces Math.random with a seeded generator so a failing run can be
 * reproduced, and prints { module: [problem, ...] } to stdout.
 *
 * Usage: node tests/generate.mjs [count] [seed]
 */
import { createServer } from 'vite';

const count = parseInt(process.argv[2] ?? '2000', 10);
const seed  = parseInt(process.argv[3] ?? '20261117', 10);

const MODULES = ['ztest', 'ttest', 'indtest', 'reptest', 'anovatest', 'twowaytest', 'rmatest', 'pearsontest', 'regtest'];

/* mulberry32: small seeded PRNG */
function seeded(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const out = {};
try {
  for (const [i, name] of MODULES.entries()) {
    const mod = await server.ssrLoadModule(`/src/student/${name}.ts`);
    Math.random = seeded(seed + i);
    out[name] = Array.from({ length: count }, () => {
      const p = mod.generateProblem();
      // Table modules export the tolerance the grader allows for each hidden cell
      if (mod.cellTolerance) {
        p.tol = Object.fromEntries([...p.masked].map(field => [field, mod.cellTolerance(p, field)]));
      }
      return p;
    });
  }
} finally {
  await server.close();
}

/* Sets (the masked-cell lists) are not JSON; emit them as arrays */
process.stdout.write(JSON.stringify(out, (_k, v) => (v instanceof Set ? [...v] : v)));
