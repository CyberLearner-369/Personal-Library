import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualRange {
  start: number;
  end: number;
}

/**
 * Fixed-row-height windowing for long lists. Returns the scroll container
 * ref plus the visible slice and spacer heights; ~60 lines instead of a
 * virtualization dependency, which is all a table of books needs.
 */
export function useVirtualList(count: number, rowHeight: number, overscan = 8) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState<VirtualRange>({
    start: 0,
    end: Math.min(count, 40),
  });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(el.clientHeight / rowHeight) + overscan * 2;
    const end = Math.min(count, start + Math.max(visible, 1));
    setRange((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, [count, rowHeight, overscan]);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  return {
    containerRef,
    start: range.start,
    end: range.end,
    padTop: range.start * rowHeight,
    padBottom: Math.max(0, (count - range.end) * rowHeight),
  };
}
