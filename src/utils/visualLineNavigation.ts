import { Sentence } from '../types';
import { isNavigableToken } from './tokenNavigation';

interface WordBox {
  index: number;
  node: HTMLElement;
  x: number;
  y: number;
  height: number;
}

/** A citation can occupy multiple visual rows while remaining one token. */
export function createVisualLineNavigator() {
  let memory: { sentence: string; layout: string; index: number; row: number; x: number } | null = null;
  const reset = () => { memory = null; };
  const move = (sentence: Sentence, direction: -1 | 1): number | null => {
    const flow = Array.from(document.querySelectorAll<HTMLElement>('[data-source-sentence]'))
      .find(element => element.dataset.sourceSentence === sentence.id);
    if (!flow) return null;
    const lineHeight = parseFloat(getComputedStyle(flow).lineHeight) || 50;
    const boxes: WordBox[] = [];
    flow.querySelectorAll<HTMLElement>('[data-source-token]').forEach(node => {
      const index = Number(node.dataset.sourceToken);
      const token = sentence.tokens[index];
      if (!isNavigableToken(token) || node.dataset.sourceSpace === 'true'
        || !node.offsetWidth || !node.offsetHeight) return;
      boxes.push({ index, node, x: node.offsetLeft + node.offsetWidth / 2,
        y: node.offsetTop + node.offsetHeight / 2, height: node.offsetHeight });
    });
    boxes.sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: { y: number; words: WordBox[] }[] = [];
    for (const box of boxes) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(row.y - box.y) < lineHeight / 3) row.words.push(box);
      else rows.push({ y: box.y, words: [box] });
    }
    // Read fresh layout every press, invalidating the saved row/column after reflow.
    const layout = boxes.map(box => `${box.index}:${box.x}:${box.y}:${box.height}`).join('|');
    if (memory?.sentence !== sentence.id || memory.layout !== layout || memory.index !== sentence.activeTokenIndex) reset();
    const currentRow = memory?.row ?? rows.findIndex(row => row.words.some(box => box.index === sentence.activeTokenIndex));
    if (currentRow < 0) return null;
    const current = rows[currentRow].words.find(box => box.index === sentence.activeTokenIndex);
    if (!current) return null;
    const x = memory?.x ?? current.x;
    memory = { sentence: sentence.id, layout, row: currentRow, index: sentence.activeTokenIndex, x };
    const nextRow = currentRow + direction;
    if (nextRow < 0 || nextRow >= rows.length) return null;
    const destination = rows[nextRow].words.reduce((best, box) =>
      Math.abs(box.x - x) < Math.abs(best.x - x) ? box : best);
    memory = { ...memory, row: nextRow, index: destination.index };

    // Only the card scrolls. Coordinates ignore ancestor 3D transforms.
    const scroll = flow.closest<HTMLElement>('.sentence-card-scroll');
    if (scroll) {
      let top = 0;
      let element: HTMLElement | null = destination.node;
      while (element && element !== scroll) {
        top += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }
      if (element === scroll) {
        const padding = 10;
        const bottom = top + destination.node.offsetHeight;
        if (top - padding < scroll.scrollTop) scroll.scrollTop = Math.max(0, top - padding);
        else if (bottom + padding > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = bottom + padding - scroll.clientHeight;
      }
    }
    return destination.index;
  };
  return { move, reset };
}
