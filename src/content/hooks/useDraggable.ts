import { useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../../lib/messaging';

const DRAG_THRESHOLD = 4;

// Adopts initialOffset (e.g. loaded async) until the user actually drags —
// after that, the drag's own offset wins.
export function useDraggable(initialOffset: Point, onDragEnd: (offset: Point) => void) {
  const [offset, setOffset] = useState<Point>(initialOffset);
  const offsetRef = useRef(initialOffset);
  const hasDragged = useRef(false);
  const drag = useRef<{ startX: number; startY: number; origin: Point; moved: boolean } | null>(null);

  useEffect(() => {
    if (hasDragged.current) return;
    offsetRef.current = initialOffset;
    setOffset(initialOffset);
  }, [initialOffset]);

  function onPointerDown(ev: PointerEvent) {
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    drag.current = { startX: ev.clientX, startY: ev.clientY, origin: offsetRef.current, moved: false };
  }

  function onPointerMove(ev: PointerEvent) {
    const state = drag.current;
    if (!state) return;
    const dx = ev.clientX - state.startX;
    const dy = ev.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    state.moved = true;
    hasDragged.current = true;
    const next = { x: state.origin.x + dx, y: state.origin.y + dy };
    offsetRef.current = next;
    setOffset(next);
  }

  function onPointerUp(): boolean {
    const moved = drag.current?.moved ?? false;
    drag.current = null;
    if (moved) onDragEnd(offsetRef.current);
    return moved;
  }

  return { offset, onPointerDown, onPointerMove, onPointerUp };
}
