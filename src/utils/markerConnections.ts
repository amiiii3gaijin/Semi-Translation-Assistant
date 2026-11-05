export interface MarkerSegment {
  id: string; x: number; y: number; width: number; height: number; row: number;
  dashed: boolean; consistent: boolean; connection?: string; start: number; end: number;
  dot?: boolean;
}
/** Never extend a word's stroke into its neighbor. Dots occupy reserved gaps only. */
export function connectMarkers(input: MarkerSegment[], fontSize: number): MarkerSegment[] {
  const lines = input.map(m => ({...m}));
  const dots: MarkerSegment[] = [];
  // A dot touching a term takes the term's tint; a grey dot beside a tinted line reads as a seam.
  const dotAt = (m: MarkerSegment, x: number, suffix: string, consistent: boolean) => dots.push({ ...m, id: `${m.id}_${suffix}`, x,
    width: 0.05, height: m.height * 1.15, dashed: false, consistent, dot: true });
  for (let i=1; i<lines.length; i++) {
    const left=lines[i-1], right=lines[i];
    const connected=left.connection === right.connection && (left.end + 1 === right.start || left.end === right.start);
    if (left.row !== right.row) {
      if (connected) {
        const reserve=Math.min(fontSize*0.22,left.width/3,right.width/3);
        const edge=left.x+left.width;
        left.width-=reserve; right.x+=reserve; right.width-=reserve;
        dotAt(left,edge-reserve*0.3,'continue',left.consistent); dotAt(right,right.x-reserve*0.7,'resume',right.consistent);
      }
      continue;
    }
    const edge=left.x+left.width;
    const gap=right.x-edge;
    if (connected && left.dashed === right.dashed && left.consistent !== right.consistent) {
      // Only the tint changes: one continuous line that changes colour in the gap's middle.
      const middle=edge+gap/2;
      left.width=middle-left.x; right.width=right.x+right.width-middle; right.x=middle;
      continue;
    }
    const required=fontSize*(connected ? 0.30 : 0.48);
    const inset=Math.min(Math.max(0,required-gap)/2,left.width/3,right.width/3);
    left.width-=inset; right.x+=inset; right.width-=inset;
    if (connected) dotAt(left,(left.x+left.width+right.x)/2,'link',left.consistent || right.consistent);
  }
  return [...lines,...dots];
}
