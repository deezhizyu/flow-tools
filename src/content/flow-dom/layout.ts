// Flow's own scroll wrapper, one level above the contenteditable div —
// wraps just the textbox, not the Frames/Ingredients row above it.
export function getPromptScrollContainer(box: HTMLElement): HTMLElement | null {
  return box.parentElement?.closest('[data-scroll-state]') ?? null;
}

// Flow's own re-renders can overwrite this inline style, so it's reapplied
// every tick rather than set once.
export function applyPromptMaxHeight(container: HTMLElement | null): void {
  if (!container) return;
  container.style.maxHeight = '100px';
}

export type FlowRouteMode = 'compose' | 'edit';

// An open image/video's edit view has nothing for the overlay to apply to.
export function getFlowRouteMode(): FlowRouteMode {
  return location.pathname.includes('/edit/') ? 'edit' : 'compose';
}
