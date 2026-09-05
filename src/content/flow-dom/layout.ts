// Flow's own scroll wrapper, one level above the contenteditable div —
// wraps just the textbox, not the Frames/Ingredients row above it.
export function getPromptScrollContainer(box: HTMLElement): HTMLElement | null {
  return box.closest<HTMLElement>('flow-rich-text-editor') ?? null;
}

// Flow's own re-renders can overwrite this inline style, so it's reapplied
// every tick rather than set once.
export function applyPromptMaxHeight(container: HTMLElement | null): void {
  if (!container) return;
  container.style.maxHeight = '100px';
}

export type FlowRouteMode = 'compose' | 'edit';

export function getFlowRouteMode(): FlowRouteMode {
  return location.pathname.includes('/edit/') ? 'edit' : 'compose';
}
