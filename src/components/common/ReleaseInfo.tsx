import { useEffect, useState } from 'react';
import history from '../../../release-history.json';

declare const __RELEASE__: { version: string; date: string; build: string };
const current = __RELEASE__;

export function ReleaseInfo() {
  const [status, setStatus] = useState('正在核对版本…');
  useEffect(() => {
    let live = true;
    let pending: AbortController | undefined;
    const check = async () => {
      pending?.abort();
      const controller = new AbortController(); pending = controller;
      const timer = window.setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('unavailable');
        const remote = await response.json();
        if (typeof remote.build !== 'string' || typeof remote.version !== 'string') throw new Error('invalid');
        if (live && pending === controller) setStatus(remote.build === current.build ? '与当前网站版本一致' : `网站已更新为 v${remote.version}，保存后刷新`);
      } catch { if (live && pending === controller) setStatus('暂时无法核对网站版本'); }
      finally { clearTimeout(timer); }
    };
    void check();
    window.addEventListener('focus', check);
    const interval = window.setInterval(check, 60000);
    return () => { live = false; pending?.abort(); clearInterval(interval); window.removeEventListener('focus', check); };
  }, []);
  return <footer className="release-info">
    <div><span title={`构建 ${current.build}`}>半翻 v{current.version}</span><span className="release-status">{status}</span></div>
    <details><summary>更新记录</summary>
      {history.map(release => <section key={release.version}>
        <p>v{release.version} · {release.date}</p>
        <ul>{release.changes.map(change => <li key={change}>{change}</li>)}</ul>
      </section>)}
      <p className="release-status">当前构建：{current.build}</p>
    </details>
  </footer>;
}
