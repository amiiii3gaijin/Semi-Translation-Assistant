import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// One command for every check. Each script runs in its own process because
// several of them patch globals (keyboard hook, DOM, clipboard) for simulation.
// New checks named scripts/*-check.ts are picked up automatically.
const tsx = path.resolve('node_modules/tsx/dist/cli.mjs');
const tsc = path.resolve('node_modules/typescript/bin/tsc');
const scripts = ['parser-regression.ts', ...readdirSync('scripts').filter(name => name.endsWith('-check.ts')).sort(), 'platform-import-review.ts'];
const checks: { name: string; args: string[]; needs?: string }[] = [
  { name: 'tsc --noEmit', args: [tsc, '--noEmit'] },
  ...scripts.map(name => ({ name, args: [tsx, path.join('scripts', name)],
    // Replays the user's own article, which stays in local-only and is never uploaded.
    needs: name === 'platform-import-review.ts' ? 'local-only/icai-platform-source.txt' : undefined })),
];

let failed = 0, skipped = 0;
for (const check of checks) {
  if (check.needs && !existsSync(check.needs)) { skipped++; console.log(`－ ${check.name}（缺少 ${check.needs}，跳过）`); continue; }
  const started = performance.now();
  const run = spawnSync(process.execPath, check.args, { encoding: 'utf8' });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (run.status === 0) { console.log(`✓ ${check.name}  ${seconds}s`); continue; }
  failed++;
  console.log(`✗ ${check.name}  ${seconds}s`);
  console.log(`${run.stdout ?? ''}${run.stderr ?? ''}${run.error ?? ''}`.trim().split('\n').slice(-25).map(line => `    ${line}`).join('\n'));
}
const ran = checks.length - skipped;
console.log(`\n${ran - failed} / ${ran} 通过${skipped ? `，${skipped} 项跳过` : ''}。`);
process.exit(failed ? 1 : 0);
