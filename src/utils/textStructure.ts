export interface SourceSpan { start: number; end: number }

/** Fenced blocks are opaque source, including unmatched fences through EOF. */
export function codeBlocks(source: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  let open: { start: number; marker: string } | undefined;
  for (const match of source.matchAll(/^[ \t]{0,3}(`{3,}|~{3,})[^\r\n]*(?:\r?\n|$)/gm)) {
    const marker = match[1];
    if (!open) open = { start: match.index!, marker };
    else if (marker[0] === open.marker[0] && marker.length >= open.marker.length &&
      match[0].trim() === marker) {
      spans.push({ start: open.start, end: match.index! + match[0].length }); open = undefined;
    }
  }
  if (open) spans.push({ start: open.start, end: source.length });
  return spans;
}

/** Only syntax-only markers; source offsets and copied text are never stripped. */
export function markdownMarkers(source: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const match of source.matchAll(/^[ \t]{0,3}(?:#{1,6}(?=\s)|(?:[-+*]|\d+[.)])(?=\s)|(?:-{3,}|\*{3,}|_{3,})[ \t]*$)|\*{2}|`+/gm)) {
    spans.push({ start: match.index!, end: match.index! + match[0].length });
  }
  return spans;
}
