import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function releaseInfo() {
  const hash = createHash('sha256');
  const walk = (file: string) => {
    if (fs.statSync(file).isDirectory()) fs.readdirSync(file).sort().forEach(name => walk(path.join(file, name)));
    else { hash.update(file.replaceAll('\\', '/')); hash.update(fs.readFileSync(file)); }
  };
  ['src', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'release-history.json'].forEach(walk);
  const history = JSON.parse(fs.readFileSync('release-history.json', 'utf8'));
  const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  if (history[0].version !== version) throw new Error('package.json 与版本记录不一致');
  return { version, date: history[0].date, build: hash.digest('hex').slice(0, 12) };
}
