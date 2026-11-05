import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { releaseInfo } from './releaseInfo';

const release = releaseInfo();
const target = path.resolve('local-only/releases', `${release.version}-${release.build}-${Date.now()}`);
if (fs.existsSync(target)) throw new Error(`快照已存在，不会覆盖：${target}`);
const roots = ['src', 'public', 'scripts', 'app', 'assets'];
const files = ['package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html', 'metadata.json', '.gitignore', '.env.example', 'release-history.json', 'VERSIONING.md'];
const manifest: Record<string, string> = {};
function copy(source: string, relative = source) {
  if (!fs.existsSync(source)) return;
  if (fs.statSync(source).isDirectory()) { for (const name of fs.readdirSync(source)) copy(path.join(source, name), path.join(relative, name)); return; }
  const destination = path.join(target, 'source', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const bytes = fs.readFileSync(source); fs.writeFileSync(destination, bytes);
  manifest[relative.replaceAll('\\', '/')] = createHash('sha256').update(bytes).digest('hex');
}
[...roots, ...files].forEach(file => copy(file));
if (fs.existsSync('dist/version.json')) {
  const built = JSON.parse(fs.readFileSync('dist/version.json', 'utf8'));
  if (built.build === release.build) {
    const copyWebsite = (source: string, destination: string) => {
      if (fs.statSync(source).isDirectory()) {
        fs.mkdirSync(destination, { recursive: true });
        for (const name of fs.readdirSync(source)) copyWebsite(path.join(source, name), path.join(destination, name));
      } else fs.writeFileSync(destination, fs.readFileSync(source));
    };
    copyWebsite('dist', path.join(target, 'website'));
  }
}
// This completion marker is written last. Interrupted folders are never valid releases.
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify({ ...release, complete: true, archivedAt: new Date().toISOString(), files: manifest }, null, 2));
console.log(`已保存源码、校验清单及匹配的网页构建：${target}`);
