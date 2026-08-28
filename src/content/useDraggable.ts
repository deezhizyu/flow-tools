import { useEffect, useRef, useState } from 'preact/hooks';

interface Point {
  x: number;
  y: number;
}

const DRAG_THRESHOLD = 4;

// Tracks a drag offset for a handle element, applied by the caller as a
// transform on whatever container should move with it. Starts from
// `initialOffset` (e.g. a persisted position loaded asynchronously) and
// keeps adopting it as it arrives — until the user actually drags, after
// which the drag's own offset wins and `onDragEnd` reports it back for the
// caller to persist. onPointerUp also returns whether the pointer moved
// past the threshold, so the handle can tell a drag apart from a plain
// click and skip its click action for one.
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
