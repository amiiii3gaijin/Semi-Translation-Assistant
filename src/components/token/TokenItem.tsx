import { Token } from '../../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TokenItemProps {
  key?: string | number;
  token: Token;
  isActive: boolean;
  dragPos?: 'single' | 'start' | 'middle' | 'end' | null;
  onPointerDown?: () => void;
  onPointerEnter?: () => void;
}

export function TokenItem({ token, isActive, dragPos, onPointerDown, onPointerEnter }: TokenItemProps) {
  let dragClasses = '';
  const shouldScale = !token.isCitation;
  const layoutClass = token.isCitation ? "inline box-decoration-clone px-[4px] mx-[1px]" : "inline-block px-[4px] mx-[1px]";

  if (dragPos) {
      if (dragPos === 'single') dragClasses = `bg-blue-500 text-white rounded-[10px] shadow-lg shadow-blue-500/30 z-20 relative font-bold ${shouldScale ? 'transform scale-105' : ''}`;
      else if (dragPos === 'start') dragClasses = 'bg-blue-500 text-white rounded-l-[12px] rounded-r-[4px] z-20 relative font-bold';
      else if (dragPos === 'middle') dragClasses = 'bg-blue-500 text-white rounded-[4px] z-20 relative font-bold';
      else if (dragPos === 'end') dragClasses = 'bg-blue-500 text-white rounded-r-[12px] rounded-l-[4px] z-20 relative font-bold';
  } else if (isActive) {
      dragClasses = `bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 rounded-[10px] z-20 relative ${shouldScale ? 'transform scale-[1.12] -translate-y-[1px]' : ''}`;
  } else {
      dragClasses = token.isPunctuation ? 'text-gray-400' : 'hover:bg-black/5 text-gray-800 rounded-lg hover:shadow-sm';
  }

  return (
    <span
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      className={twMerge(
        clsx(
          "cursor-pointer transition-all duration-150 select-none",
          layoutClass,
          dragClasses
        )
      )}
    >
      {token.text}
    </span>
  );
}
