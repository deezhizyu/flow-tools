export function nextPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const e = el as HTMLElement;
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

// `timeout` is a fallback for a condition that never arrives.
export function waitFor<T>(fn: () => T | null | undefined, { timeout = 2500 }: { timeout?: number } = {}): Promise<T | null> {
  return new Promise((resolve) => {
    const immediate = fn();
    if (immediate) {
      resolve(immediate);
      return;
    }
    let done = false;
    const finish = (val: T | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(val);
    };
    const observer = new MutationObserver(() => {
      const val = fn();
      if (val) finish(val);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    const timer = setTimeout(() => finish(fn() ?? null), timeout);
  });
}

// Flow's panel is built on Radix UI, which opens on pointerdown, not
// "click" — a script-dispatched el.click() is a no-op, so a full
// pointer/mouse sequence is dispatched instead.
export function fullClick(el: Element | null): void {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}
