import assert from 'node:assert/strict';
import { fitCursor, CURSOR_SIDE_EM, INNER_GAP_EM, NEIGHBOUR_CLEAR_EM, type CursorSlot } from '../src/utils/cursorFit';

// Lays out one row like the source flow: each word's ink is `chars` em wide, padded and separated by 1px margins.
const row = (chars: number[], fontSize: number, pad: number, rowIndex = 0, firstIndex = 0, gap = 2): CursorSlot[] => {
  let x = 0;
  return chars.map((count, i) => {
    const slot = { index: firstIndex + i, row: rowIndex, x, width: count * fontSize + pad * 2, pad };
    x += slot.width + gap;
    return slot;
  });
};
const ink = (s: CursorSlot) => ({ left: s.x + s.pad, right: s.x + s.width - s.pad, centre: s.x + s.width / 2, half: s.width / 2 - s.pad });
const scaled = (s: CursorSlot, scale: number) => ({ left: ink(s).centre - ink(s).half * scale, right: ink(s).centre + ink(s).half * scale });
const eps = 1e-6;

const checkRow = (slots: CursorSlot[], start: number, end: number, fontSize: number) => {
  const fit = fitCursor(slots, start, end, fontSize, 1.12);
  assert.ok(fit.scale >= 1 && fit.scale <= 1.12 + eps, `scale ${fit.scale}`);
  for (const { row, left, right } of fit.rows) {
    const list = slots.filter(s => s.row === row);
    const run = list.filter(s => s.index >= start && s.index <= end);
    const before = list[list.indexOf(run[0]) - 1];
    const after = list[list.indexOf(run[run.length - 1]) + 1];
    // Never reach an unselected word: keep the clearance, or at least stay on our half of a narrow gap.
    if (before) assert.ok(left >= ink(before).right + Math.min(fontSize * NEIGHBOUR_CLEAR_EM, (ink(run[0]).left - ink(before).right) / 2) - eps, 'left neighbour covered');
    if (after) assert.ok(right <= ink(after).left - Math.min(fontSize * NEIGHBOUR_CLEAR_EM, (ink(after).left - ink(run[run.length - 1]).right) / 2) + eps, 'right neighbour covered');
    // The magnified words stay inside their key.
    assert.ok(left <= scaled(run[0], fit.scale).left + eps && right >= scaled(run[run.length - 1], fit.scale).right - eps, 'word sticks out of the cursor');
    // Words inside one cursor keep a visible gap.
    for (let i = 1; i < run.length; i++) {
      assert.ok(scaled(run[i], fit.scale).left - scaled(run[i - 1], fit.scale).right >= fontSize * INNER_GAP_EM - eps, 'words inside the cursor touch');
    }
  }
  return fit;
};

// A two-character word between neighbours keeps the full magnification and the full side room.
const main = row([2, 2, 2], 25, 4);
const short = checkRow(main, 1, 1, 25);
assert.equal(short.scale, 1.12);
assert.ok(Math.abs(scaled(main[1], 1.12).left - short.rows[0].left - 25 * CURSOR_SIDE_EM) < eps);

// A long word grows less instead of covering the word before it (the 垃 / 圾拆解带来的 case).
const long = checkRow(row([4, 6, 2], 25, 4), 1, 1, 25);
assert.ok(long.scale < 1.06, `long word scale ${long.scale}`);

// A phrase shares one magnification and its words do not merge.
const phrase = checkRow(row([2, 2, 3, 2, 2], 25, 4), 1, 3, 25);
assert.ok(phrase.scale < 1.12 && phrase.scale > 1);

// A word alone at both ends of a row is limited only by itself.
assert.equal(checkRow(row([6], 25, 4), 0, 0, 25).scale, 1.12);

// Annotation spacing: the old 0.04em padding left about 2px between words; even then the cursor stays on its side.
checkRow(row([2, 2, 2], 19, 19 * 0.04), 1, 1, 19);
// With the current 0.16em padding a short annotation word gets the full magnification again.
assert.equal(checkRow(row([2, 2, 2], 19, 19 * 0.16), 1, 1, 19).scale, 1.12);

// A selection over two rows: one rectangle per row, one shared magnification.
const twoRows = [...row([2, 3, 2], 25, 4, 0, 0), ...row([2, 2, 2], 25, 4, 1, 3)];
const wrapped = checkRow(twoRows, 1, 4, 25);
assert.deepEqual(wrapped.rows.map(r => r.row), [0, 1]);

// Nothing selected: no rectangle.
assert.equal(fitCursor(main, -1, -1, 25, 1.12).rows.length, 0);
console.log('cursor fit ok');
