import { useRef, useState } from 'preact/hooks';

interface Point {
  x: number;
  y: number;
}

const DRAG_THRESHOLD = 4;

// Tracks a drag offset for a handle element, applied by the caller as a
// transform on whatever container should move with it. onPointerUp reports
// whether the pointer actually moved past the threshold, so the handle can
// tell a drag apart from a plain click and skip its click action for one.
export function useDraggable() {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; origin: Point; moved: boolean } | null>(null);

  function onPointerDown(ev: PointerEvent) {
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    drag.current = { startX: ev.clientX, startY: ev.clientY, origin: offset, moved: false };
  }

  function onPointerMove(ev: PointerEvent) {
    const state = drag.current;
    if (!state) return;
    const dx = ev.clientX - state.startX;
    const dy = ev.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    state.moved = true;
    setOffset({ x: state.origin.x + dx, y: state.origin.y + dy });
  }

  function onPointerUp(): boolean {
    const moved = drag.current?.moved ?? false;
    drag.current = null;
    return moved;
  }

  return { offset, onPointerDown, onPointerMove, onPointerUp };
}
