// Nano Banana / Veo tiles run a blur+grain settle animation after a
// generation finishes that lingers a couple seconds past the point where
// the real image is already decoded and ready to paint. This watches every
// in-flight tile's progress badge and, the instant its image can actually
// be shown, jumps straight to the finished look instead of waiting out
// Flow's own animation.

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

// The tile is the closest ancestor of the badge that also contains both the
// blur layer and the actual image, i.e. the smallest ancestor scoped to a
// single generation rather than the whole gallery grid.
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
// whether the image has actually decoded — so it can already be revealing
// an empty layer before there's anything to show. Holding it hidden for the
// whole wait keeps the normal placeholder as the only visible thing until
// decode is confirmed, then everything flips to final state in one frame.
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

export function watchInstantReveal(): () => void {
  const tracked = new Map<Element, HTMLElement>();
  let scheduled = false;

  function sync(): void {
    for (const el of document.querySelectorAll('div, span')) {
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

  function scheduleSync(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();

  return () => observer.disconnect();
}
