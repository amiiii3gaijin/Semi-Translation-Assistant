/** Fits the source cursor into the space a line actually has.
 *
 * The selected words are magnified and sit on a key-shaped surface. Neither may reach an
 * unselected neighbour: when the gap is too narrow, the side room shrinks to its floor and
 * then the magnification drops, so a long word or phrase grows less instead of covering the
 * next word. Words inside one cursor keep a visible gap for the same reason. */

export interface CursorSlot {
  index: number;
  row: number;
  /** Slot box in the flow's layout coordinates; the face fills it and scales about its centre. */
  x: number;
  width: number;
  /** Horizontal face padding: the ink box is the slot minus this on each side. */
  pad: number;
}

export interface CursorFit {
  scale: number;
  rows: { row: number; left: number; right: number }[];
}

export const CURSOR_SIDE_EM = 0.16;
export const CURSOR_SIDE_MIN_EM = 0.08;
export const NEIGHBOUR_CLEAR_EM = 0.1;
export const INNER_GAP_EM = 0.14;

const inkLeft = (slot: CursorSlot) => slot.x + slot.pad;
const inkRight = (slot: CursorSlot) => slot.x + slot.width - slot.pad;
const half = (slot: CursorSlot) => Math.max(0.5, (slot.width - slot.pad * 2) / 2);
const centre = (slot: CursorSlot) => slot.x + slot.width / 2;

/** `slots` are in reading order, whitespace excluded; `start`..`end` is the selected token range. */
export function fitCursor(slots: CursorSlot[], start: number, end: number, fontSize: number, maxScale: number): CursorFit {
  const side = fontSize * CURSOR_SIDE_EM;
  const sideMin = fontSize * CURSOR_SIDE_MIN_EM;
  const clear = fontSize * NEIGHBOUR_CLEAR_EM;
  const innerGap = fontSize * INNER_GAP_EM;
  const byRow = new Map<number, CursorSlot[]>();
  for (const slot of slots) {
    const list = byRow.get(slot.row);
    if (list) list.push(slot); else byRow.set(slot.row, [slot]);
  }
  const runs: { row: number; run: CursorSlot[]; limitLeft: number; limitRight: number }[] = [];
  let scale = maxScale;
  for (const [row, list] of byRow) {
    const first = list.findIndex(slot => slot.index >= start && slot.index <= end);
    if (first < 0) continue;
    let last = first;
    while (last + 1 < list.length && list[last + 1].index >= start && list[last + 1].index <= end) last++;
    const run = list.slice(first, last + 1);
    const before = list[first - 1];
    const after = list[last + 1];
    // Keep the clearance, but never claim more than half of a gap narrower than twice the clearance.
    const limitLeft = before
      ? inkRight(before) + Math.min(clear, Math.max(0, inkLeft(run[0]) - inkRight(before)) / 2) : -Infinity;
    const limitRight = after
      ? inkLeft(after) - Math.min(clear, Math.max(0, inkLeft(after) - inkRight(run[run.length - 1])) / 2) : Infinity;
    // A tight gap is shared: half keeps the side room (down to its floor), the rest goes to magnification.
    const growth = (room: number, slot: CursorSlot) => 1 + Math.max(0, room - Math.max(sideMin, Math.min(side, room / 2))) / half(slot);
    scale = Math.min(scale,
      growth(inkLeft(run[0]) - limitLeft, run[0]),
      growth(limitRight - inkRight(run[run.length - 1]), run[run.length - 1]));
    for (let i = 1; i < run.length; i++) {
      const gap = inkLeft(run[i]) - inkRight(run[i - 1]);
      scale = Math.min(scale, 1 + Math.max(0, gap - innerGap) / (half(run[i - 1]) + half(run[i])));
    }
    runs.push({ row, run, limitLeft, limitRight });
  }
  scale = Math.max(1, scale);
  return {
    scale,
    rows: runs.map(({ row, run, limitLeft, limitRight }) => {
      const head = run[0];
      const tail = run[run.length - 1];
      const leftInk = centre(head) - half(head) * scale;
      const rightInk = centre(tail) + half(tail) * scale;
      // Equal room on both sides keeps the word centred on its key.
      const room = Math.max(0, Math.min(side, leftInk - limitLeft, limitRight - rightInk));
      return { row, left: Math.max(limitLeft, leftInk - room), right: Math.min(limitRight, rightInk + room) };
    }),
  };
}
