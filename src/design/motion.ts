/** Seconds, shared with the CSS timing tokens in index.css. */
export const UI_MOTION = {
  quick: { duration: 0.15, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  control: { duration: 0.18, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  panel: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  stream: { type: 'spring' as const, stiffness: 260, damping: 30, mass: 1 },
  progress: { type: 'spring' as const, stiffness: 120, damping: 25 },
};

export const SELECTION_SCALE = 1.12;
export const SELECTION_LIFT = 1;
