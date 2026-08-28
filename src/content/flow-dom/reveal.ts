// Nano Banana / Veo tiles run a blur+grain settle animation after a
// generation finishes that lingers a couple seconds past the point where
// the real image is already decoded — this jumps straight to the finished
// look instead of waiting out Flow's own animation.

import { waitFor } from './dom-utils';

function isProgressBadge(el: Element): boolean {
  return el.children.length === 0 && /^\d{1,3}%$/.test((el.textContent ?? '').trim());
}

// The settle animation drives `backdrop-filter: blur(var(--blur-amount))`
// on a pseudo-element — matched by behavior instead of a class name, since
// Flow's generated class hashes aren't stable across deploys.
function hasBlurFilter(el: Element): boolean {
  return getComputedStyle(el, '::after').backdropFilter.includes('blur(');
}

function findBlurLayer(root: Element): HTMLElement | null {
  if (hasBlurFilter(root)) return root as HTMLElement;
  for (const el of root.querySelectorAll('*')) {
    if (hasBlurFilter(el)) return el as HTMLElement;
  }
  return null;
}

function findTile(badge: Element): HTMLElement | null {
  let node = badge.parentElement;
  while (node && node !== document.body) {
    if (node.querySelector('img') && findBlurLayer(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function whenPaintReady(img: HTMLImageElement): Promise<void> {
  const decode = () => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve());
  if (img.complete && img.naturalWidth > 0) return decode();
  return new Promise((resolve) => {
    img.addEventListener('load', () => void decode().then(resolve), { once: true });
  });
}

// The blur layer's own opacity fades in on Flow's schedule, independent of
// whether the image has actually decoded, so it's held hidden until decode
// is confirmed and everything flips to final state in one frame.
async function revealTile(tile: HTMLElement): Promise<void> {
  const blurLayer = await waitFor(() => findBlurLayer(tile));
  if (!blurLayer) return;
  blurLayer.classList.add('fqs-reveal-hold');

  const img = await waitFor(() => tile.querySelector('img'));
  if (!img) return;
  await whenPaintReady(img);

  blurLayer.classList.remove('fqs-reveal-hold');
  blurLayer.classList.add('fqs-reveal-done');
  img.classList.add('fqs-reveal-done');
  for (const sibling of blurLayer.parentElement?.children ?? []) {
    if (sibling !== blurLayer) sibling.classList.add('fqs-reveal-hide');
  }
}

// Badges are only ever discovered at the moment they're inserted (or, more
// rarely, when their text is filled in via a childList replacement on the
// element itself) — collecting candidates from the mutation batch avoids
// re-querying the whole document on every tick.
function collectCandidates(mutations: MutationRecord[]): Set<Element> {
  const candidates = new Set<Element>();
  const addSubtree = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.matches('div, span')) candidates.add(el);
    for (const child of el.querySelectorAll('div, span')) candidates.add(child);
  };
  for (const mutation of mutations) {
    addSubtree(mutation.target);
    for (const node of mutation.addedNodes) addSubtree(node);
  }
  return candidates;
}

export function watchInstantReveal(): () => void {
  const tracked = new Map<Element, HTMLElement>();
  let scheduled = false;
  let pending: MutationRecord[] = [];

  function sync(candidates: Iterable<Element>): void {
    for (const el of candidates) {
      if (!tracked.has(el) && isProgressBadge(el)) {
        const tile = findTile(el);
        if (tile) tracked.set(el, tile);
      }
    }
    for (const [badge, tile] of tracked) {
      if (!document.body.contains(badge)) {
        void revealTile(tile);
        tracked.delete(badge);
      }
    }
  }

  function scheduleSync(mutations?: MutationRecord[]): void {
    if (mutations) pending.push(...mutations);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const batch = pending;
      pending = [];
      sync(collectCandidates(batch));
    });
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync(document.querySelectorAll('div, span'));

  return () => observer.disconnect();
}
