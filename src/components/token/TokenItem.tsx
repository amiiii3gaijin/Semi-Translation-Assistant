import React from 'react';
import { Token } from '../../types';
import { clsx } from 'clsx';

interface TokenItemProps {
  token: Token;
  index: number;
  selected: boolean;
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerEnter?: (event: React.PointerEvent) => void;
}

/** Long atomic citations keep a single selection identity, but their presentation
 * can wrap into small fragments so every selected fragment can lift consistently. */
export function TokenItem({ token, index, selected, onPointerDown, onPointerEnter }: TokenItemProps) {
  const fragmented = token.isCitation || token.text.length > 24;
  const pieces = fragmented
    ? (token.text.match(/\s+|\S+/gu) ?? []).flatMap(piece => {
        if (/^\s+$/u.test(piece) || piece.length <= 16) return [piece];
        const letters = Array.from(piece);
        const chunks: string[] = [];
        for (let i = 0; i < letters.length; i += 8) chunks.push(letters.slice(i, i + 8).join(''));
        return chunks;
      })
    : [token.text];
  return <>{pieces.map((piece, part) => {
    const whitespace = /^\s+$/u.test(piece);
    return <span key={part} data-source-token={index} data-source-space={whitespace || undefined}
      onPointerDown={onPointerDown} onPointerEnter={onPointerEnter}
      className={clsx('source-token-slot', {
        'source-token-space': whitespace, 'source-token-fragment': fragmented,
      })}>
      <span className={clsx('source-token-face', {
        'source-token-selected': selected,
        'source-token-punctuation': token.isPunctuation && !selected,
      })}>{piece}</span>
    </span>;
  })}</>;
}

