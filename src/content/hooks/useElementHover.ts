import { useEffect, useState } from 'preact/hooks';

export interface ElementHoverState<T> {
  root: HTMLElement;
  payload: T;
  visible: boolean;
}

// Shared by useTileHover and useReferenceHover — tracks whichever DOM root
// (found via findRoot) the pointer is currently over, kept mounted at its
// last-known root with visible:false on mouseout so a fade-out animation
// has something to animate from. findRoot/getPayload must be stable
// (module-level) functions — they're effect dependencies, so a fresh
// closure on every render would tear the listeners down and rebuild them
// constantly.
export function useElementHover<T>(
  findRoot: (el: Element) => HTMLElement | null,
  getPayload: (root: HTMLElement) => T
): ElementHoverState<T> | null {
  const [state, setState] = useState<ElementHoverState<T> | null>(null);

  useEffect(() => {
    function show(root: HTMLElement) {
      setState({ root, payload: getPayload(root), visible: true });
    }

    function hide() {
      setState((prev) => (prev ? { ...prev, visible: false } : prev));
    }

    function onMouseOver(ev: MouseEvent) {
      const root = findRoot(ev.target as Element);
      if (root) show(root);
    }

    function onMouseOut(ev: MouseEvent) {
      const leavingRoot = findRoot(ev.target as Element);
      if (!leavingRoot) return;
      const related = ev.relatedTarget as Element | null;
      if (related && findRoot(related) === leavingRoot) return;
      hide();
    }

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [findRoot, getPayload]);

  return state;
}
