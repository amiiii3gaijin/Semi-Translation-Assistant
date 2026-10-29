import assert from 'node:assert/strict';
import { scheduleClipboardCopy } from '../src/utils/clipboard';

// Capability simulation only; real browser permissions still require manual QA.
let invoked = false;
let written = '';
class Item {
  constructor(public data: Record<string, Promise<Blob>>) {}
}
Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
Object.defineProperty(globalThis, 'ClipboardItem', { configurable: true, value: Item });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
  write: async (items: Item[]) => {
    invoked = true;
    written = await (await items[0].data['text/plain']).text();
  },
} } });
let resolve!: (text: string) => void;
const pending = new Promise<string>(r => { resolve = r; });
const copying = scheduleClipboardCopy(pending);
assert.equal(invoked, true, 'clipboard write begins during click, before preparation resolves');
assert.equal(written, '');
resolve('完整任务，含原文与提示词');
assert.equal(await copying, true);
assert.equal(written, '完整任务，含原文与提示词');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
  write: () => Promise.reject(new Error('NotAllowedError')),
} } });
assert.equal(await scheduleClipboardCopy(Promise.resolve('task')), false);
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
assert.equal(scheduleClipboardCopy(Promise.resolve('task')), null);
console.log('Passed: immediate write request, deferred full content, denial and unsupported fallback. Browser permission acceptance is not simulated.');
