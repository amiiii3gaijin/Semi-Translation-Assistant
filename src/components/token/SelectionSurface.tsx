import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sentence } from '../../types';
import { SELECTION_LIFT, SELECTION_SCALE, UI_MOTION } from '../../design/motion';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { phraseRibbonPath, ribbonMetrics, RibbonSurface } from '../../utils/phraseRibbon';
import { getRibbonParameters, ribbonColor, ribbonReadings, RibbonReading, useRibbonParameters } from '../../design/ribbonParameters';

interface SurfaceRect { x: number; y: number; width: number; height: number; row: number }
interface Bounds { start: number; end: number }
interface Geometry {
  selected: SurfaceRect[];
  markers: (SurfaceRect & { id: string })[];
  fontSize: number;
}

/** One continuous selection surface per visual line, including a one-word range. */
export function SelectionSurface({ container, sentence, selected }: {
  container: RefObject<HTMLDivElement | null>;
  sentence: Sentence;
  selected: Bounds;
}) {
  const parameters = useRibbonParameters();
  const [geometry, setGeometry] = useState<Geometry>({ selected: [], markers: [], fontSize: 25 });
  const liveSurfaces = useRef(new Map<string, RibbonSurface>());
  const surfaceRefs = useRef(new Map<string, (node: HTMLSpanElement | null) => void>());
  const paths = useRef(new Map<string, SVGPathElement>());
  const pendingVisualSync = useRef(false);
  const pendingReading = useRef(false);
  const latestGeometry = useRef(geometry);
  latestGeometry.current = geometry;
  const syncRibbons = (forceReading = false) => {
    if (!paths.current.size) return;
    const current = latestGeometry.current;
    const surfaces = [...liveSurfaces.current.values()];
    const readings: RibbonReading[] = [];
    const diagnostics = ribbonReadings.enabled();
    for (const line of current.markers) {
      const path = paths.current.get(line.id);
      if (!path) continue;
      const next = phraseRibbonPath(line, surfaces, current.fontSize, getRibbonParameters(), diagnostics ? (target, actual) => {
        if (target > 0.005) readings.push({ label: `第 ${line.row + 1} 行 · 词组 ${current.markers.indexOf(line) + 1}`,
          target, actual, fontSize: current.fontSize });
      } : undefined);
      if (path.getAttribute('d') !== next) path.setAttribute('d', next);
    }
    if (diagnostics) ribbonReadings.publish(readings, forceReading);
  };
  // Stable refs prevent a React rerender from briefly replacing live animation
  // geometry with the destination geometry before the next Motion frame.
  const surfaceRef = (key: string, initial: SurfaceRect) => {
    if (!surfaceRefs.current.has(key)) surfaceRefs.current.set(key, node => {
      if (node) {
        const read = (value: string, fallback: number) => {
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) ? parsed : fallback;
        };
        liveSurfaces.current.set(key, {
          left: read(node.style.left, initial.x), top: read(node.style.top, initial.y),
          width: read(node.style.width, initial.width), height: read(node.style.height, initial.height),
          opacity: read(node.style.opacity, 1), scaleX: 1,
        });
      } else liveSurfaces.current.delete(key);
      syncRibbons();
    });
    return surfaceRefs.current.get(key)!;
  };
  const reducedMotion = useReducedMotion();
  const showPhraseMarkers = usePreferencesStore(state => state.showPhraseMarkers);
  // White text follows the actual moving surface, never an anticipated target.
  const syncTextColor = () => {
    const element = container.current;
    if (!element) return;
    const surfaces = Array.from(element.querySelectorAll<HTMLElement>('.source-selection-surface'));
    element.querySelectorAll<HTMLElement>('.source-token-face').forEach(face => {
      const slot = face.parentElement!;
      const x = slot.offsetLeft + slot.offsetWidth / 2;
      const y = slot.offsetTop + slot.offsetHeight / 2;
      const covered = face.classList.contains('source-token-selected') && surfaces.some(surface =>
        x - slot.offsetWidth * 0.45 >= surface.offsetLeft &&
        x + slot.offsetWidth * 0.45 <= surface.offsetLeft + surface.offsetWidth &&
        y - slot.offsetHeight * 0.3 >= surface.offsetTop &&
        y + slot.offsetHeight * 0.3 <= surface.offsetTop + surface.offsetHeight);
      const color = covered ? 'white' : '';
      if (face.style.color !== color) face.style.color = color;
    });
  };
  // Batch synchronous Motion updates from multiple row surfaces. No idle loop,
  // no independent animation, and no extra requestAnimationFrame of latency.
  const scheduleVisualSync = (forceReading = false) => {
    pendingReading.current ||= forceReading;
    if (pendingVisualSync.current) return;
    pendingVisualSync.current = true;
    queueMicrotask(() => {
      pendingVisualSync.current = false;
      if (!container.current) return;
      const force = pendingReading.current;
      pendingReading.current = false;
      syncRibbons(force);
      syncTextColor();
    });
  };
  // Clear the previous word's inline white before the new selection is painted.
  useLayoutEffect(() => { syncTextColor(); }, [selected.start, selected.end]);
  useLayoutEffect(() => { syncRibbons(true); }, [geometry, showPhraseMarkers, parameters]);
  useEffect(() => {
    const refresh = () => syncRibbons(true);
    window.addEventListener('ribbon-dev-refresh', refresh);
    return () => window.removeEventListener('ribbon-dev-refresh', refresh);
  }, []);
  // Passive effect runs after the parent's container ref has been attached.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    const measure = () => {
      if (disposed || !element.offsetWidth || !element.offsetHeight) return;
      const all: { index: number; rect: SurfaceRect }[] = [];
      const rowCenters: number[] = [];
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 50;
      const fontSize = parseFloat(getComputedStyle(element).fontSize) || 25;
      const ribbon = ribbonMetrics(fontSize);
      element.querySelectorAll<HTMLElement>('[data-source-token]').forEach(slot => {
        const index = Number(slot.dataset.sourceToken);
        if (sentence.tokens[index]?.isWhitespace || slot.dataset.sourceSpace === 'true') return;
        {
          // Slots are inline blocks with source-flow as their offset parent.
          // Layout coordinates stay stable while ancestor cards rotate in 3D.
          if (!slot.offsetWidth || !slot.offsetHeight) return;
          const center = slot.offsetTop + slot.offsetHeight / 2;
          let row = rowCenters.findIndex(value => Math.abs(value - center) < lineHeight / 3);
          if (row < 0) { row = rowCenters.length; rowCenters.push(center); }
          all.push({ index, rect: {
            x: slot.offsetLeft, y: center - lineHeight / 2,
            width: slot.offsetWidth, height: lineHeight, row,
          } });
        }
      });
      const rangeRects = ({ start, end }: Bounds) => {
        const rows = new Map<number, SurfaceRect>();
        for (const item of all) {
          if (item.index < start || item.index > end) continue;
          const rect = { ...item.rect };
          // Expand each word footprint, not the whole phrase's horizontal scale.
          // Height stays identical when a selection changes from one word to many.
          const padding = rect.width * (SELECTION_SCALE - 1) / 2;
          rect.x -= padding;
          rect.width += padding * 2;
          const addedHeight = rect.height * (SELECTION_SCALE - 1);
          rect.y -= addedHeight / 2 + SELECTION_LIFT;
          rect.height += addedHeight;
          const last = rows.get(rect.row);
          if (last) {
            const right = Math.max(last.x + last.width, rect.x + rect.width);
            last.x = Math.min(last.x, rect.x);
            last.width = right - last.x;
          } else rows.set(rect.row, rect);
        }
        return [...rows.values()];
      };
      setGeometry({
        fontSize,
        selected: rangeRects(selected),
        markers: sentence.groups.flatMap(group => {
          const rows = new Map<number, SurfaceRect>();
          for (const { index, rect } of all) {
            if (index < group.startIndex || index > group.endIndex) continue;
            // Remove the token's horizontal padding; don't include outer spacing.
            const slot = element.querySelector<HTMLElement>(`[data-source-token="${index}"]`);
            const face = slot?.querySelector<HTMLElement>('.source-token-face');
            const padding = face ? parseFloat(getComputedStyle(face).paddingLeft) || 0 : 0;
            const left = rect.x + padding;
            const right = rect.x + rect.width - padding;
            const previous = rows.get(rect.row);
            if (previous) {
              const edge = Math.max(previous.x + previous.width, right);
              previous.x = Math.min(previous.x, left);
              previous.width = edge - previous.x;
            } else rows.set(rect.row, { ...rect, x: left, width: right - left,
              y: rect.y + lineHeight / 2 + ribbon.baselineOffset - ribbon.thickness / 2,
              height: ribbon.thickness });
          }
          return [...rows.values()].map(rect => ({ ...rect, id: `${group.id}-${rect.row}` }));
        }),
      });
      syncTextColor();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncTextColor);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [container, sentence.tokens, sentence.groups, selected.start, selected.end, showPhraseMarkers, parameters]);

  const transition = reducedMotion ? { duration: 0 } : UI_MOTION.quick;
  return <div className="source-surfaces" aria-hidden="true">
    <AnimatePresence initial={false}>
      {geometry.selected.map((rect, index) => {
        const key = index === 0 ? 'selection-primary' : 'selection-row-' + rect.row;
        return <motion.span key={key} className="source-selection-surface"
          ref={surfaceRef(key, rect)}
          initial={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, opacity: 1 }}
          animate={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.96 }}
          transition={transition}
          onUpdate={latest => {
            const previous = liveSurfaces.current.get(key);
            const value = (field: string, fallback: number) => {
              const number = Number(latest[field]);
              return Number.isFinite(number) ? number : fallback;
            };
            liveSurfaces.current.set(key, {
              left: value('left', previous?.left ?? rect.x), top: value('top', previous?.top ?? rect.y),
              width: value('width', previous?.width ?? rect.width), height: value('height', previous?.height ?? rect.height),
              opacity: value('opacity', previous?.opacity ?? 1), scaleX: value('scaleX', previous?.scaleX ?? 1),
            });
            scheduleVisualSync();
          }}
          onAnimationComplete={() => scheduleVisualSync(true)}
        />;
      })}
    </AnimatePresence>
    {showPhraseMarkers && <svg className="source-phrase-ribbons" aria-hidden="true" style={{ color: ribbonColor(parameters) }}>
      {geometry.markers.map(line => <path key={line.id}
        ref={node => {
          if (node) {
            paths.current.set(line.id, node);
            node.setAttribute('d', phraseRibbonPath(line, [...liveSurfaces.current.values()], geometry.fontSize));
          } else paths.current.delete(line.id);
        }}
        fill="none" stroke="currentColor" strokeWidth={line.height} strokeLinecap="round" strokeLinejoin="round"
      />)}
    </svg>}
  </div>;
}

