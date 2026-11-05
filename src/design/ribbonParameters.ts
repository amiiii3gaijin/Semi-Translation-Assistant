import { useSyncExternalStore } from 'react';

export const RIBBON_DEFAULTS = {
  baseline: 22, currentLift: 4.5, adjacentLift: 5.5, spread: 6,
  verticalReach: 1, widthGrowth: 0, avoidance: 0,
  lineWidth: 2, gray: 169,
};
export type RibbonParameters = typeof RIBBON_DEFAULTS;
export type RibbonKey = keyof RibbonParameters;
export const RIBBON_SCHEMA = 2;
export const RIBBON_ENGINE = 'gaussian-ribbon-v2';
export const RIBBON_FIELDS: { key: RibbonKey; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'baseline', label: '静止线位置（越大越低）', min: 12, max: 28, step: 0.25, unit: 'px' },
  { key: 'currentLift', label: '当前行托举强度', min: 0, max: 12, step: 0.25, unit: 'px' },
  { key: 'adjacentLift', label: '相邻行联动强度', min: 0, max: 12, step: 0.25, unit: 'px' },
  { key: 'spread', label: '横向扩散宽度', min: 6, max: 75, step: 0.5, unit: 'px' },
  { key: 'verticalReach', label: '纵向影响距离', min: 1, max: 40, step: 0.5, unit: 'px' },
  { key: 'widthGrowth', label: '扩散随选区宽度增长', min: 0, max: 1, step: 0.01, unit: '倍' },
  { key: 'avoidance', label: '文字避让强度', min: 0, max: 1, step: 0.01, unit: '（0＝关闭）' },
  { key: 'lineWidth', label: '线宽', min: 0.5, max: 4, step: 0.1, unit: 'px' },
  { key: 'gray', label: '灰色深浅（越大越淡）', min: 90, max: 220, step: 1, unit: '' },
];

// Keep the old experimental snapshot intact, but don't let it mask approved defaults.
const KEY = 'half-translation-ribbon-advanced-v2';
function sanitize(raw: unknown): RibbonParameters {
  const next = { ...RIBBON_DEFAULTS };
  if (!raw || typeof raw !== 'object') return next;
  for (const field of RIBBON_FIELDS) {
    const value = (raw as Record<string, unknown>)[field.key];
    if (typeof value === 'number' && Number.isFinite(value)) next[field.key] = Math.max(field.min, Math.min(field.max, value));
  }
  return next;
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.schemaVersion === RIBBON_SCHEMA) return {
      draft: sanitize(saved.draft), reference: saved.reference ? sanitize(saved.reference) : null,
    };
  } catch { /* Invalid/unavailable storage falls back to defaults. */ }
  return { draft: { ...RIBBON_DEFAULTS }, reference: null as RibbonParameters | null };
}
let state = { ...restore(), comparing: false, storageFailed: false };
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const emit = () => listeners.forEach(listener => listener());
function flush() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: RIBBON_SCHEMA, draft: state.draft, reference: state.reference }));
    if (state.storageFailed) { state = { ...state, storageFailed: false }; emit(); }
  } catch { state = { ...state, storageFailed: true }; emit(); }
}
function change(next: typeof state) {
  state = next;
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}
window.addEventListener('pagehide', flush);
import.meta.hot?.dispose(() => { flush(); window.removeEventListener('pagehide', flush); });
export const getRibbonParameters = (): RibbonParameters => state.comparing && state.reference ? state.reference : state.draft;
const subscribe = (listener: () => void) => {
  listeners.add(listener); return () => { listeners.delete(listener); };
};
export const useRibbonParameters = () => useSyncExternalStore(subscribe, getRibbonParameters, () => RIBBON_DEFAULTS);
export const useRibbonEditor = () => useSyncExternalStore(subscribe, () => state);
export const ribbonEditor = {
  set(key: RibbonKey, value: number) {
    if (state.comparing || !Number.isFinite(value)) return;
    change({ ...state, draft: sanitize({ ...state.draft, [key]: value }) });
  },
  reset() { change({ ...state, draft: { ...RIBBON_DEFAULTS }, comparing: false }); },
  saveReference() { change({ ...state, reference: { ...state.draft }, comparing: false }); },
  compare(value: boolean) { change({ ...state, comparing: value && !!state.reference }); },
};

export interface RibbonReading { label: string; target: number; actual: number; fontSize: number }
const readingListeners = new Set<(rows: RibbonReading[]) => void>();
let lastReading = 0;
export const ribbonReadings = {
  subscribe(listener: (rows: RibbonReading[]) => void) {
    readingListeners.add(listener); lastReading = 0;
    return () => { readingListeners.delete(listener); };
  },
  enabled: () => readingListeners.size > 0,
  publish(rows: RibbonReading[], force = false) {
    if (!this.enabled() || (!force && performance.now() - lastReading < 100)) return;
    lastReading = performance.now(); readingListeners.forEach(listener => listener(rows));
  },
};

export function ribbonColor(p: RibbonParameters) {
  const channel = (base: number) => Math.max(0, Math.min(255, Math.round(base + p.gray - 169)));
  return `rgb(${channel(163)}, ${channel(169)}, ${channel(179)})`;
}
