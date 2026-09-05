import { fullClick, waitFor } from './dom-utils';

export interface TileMedia {
  type: 'image' | 'video';
  src: string;
}

// <flow-grid-tile-container> wraps one tile's media plus its hover-reveal
// action row (favorite/reuse/more_vert) — the media itself carries
// data-media-id, but nothing further up does.
export function findTileRoot(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>('flow-grid-tile-container');
}

export function getTileMedia(tile: HTMLElement): TileMedia | null {
  const video = tile.querySelector('video');
  if (video?.src) return { type: 'video', src: video.src };
  const img = tile.querySelector('img');
  if (img?.src) return { type: 'image', src: img.src };
  return null;
}

// Flow only mounts its own hover-reveal row (favorite/reuse/more_vert) in
// response to genuine, browser-trusted pointer hover — a dispatched
// mouseenter/pointerenter on the tile root alone is a no-op. Firing on
// every descendant hits whichever inner element the mount listener is
// actually bound to.
function dispatchHoverEnter(tile: HTMLElement): void {
  const rect = tile.getBoundingClientRect();
  const opts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  };
  for (const el of [tile, ...tile.querySelectorAll('*')]) {
    el.dispatchEvent(new PointerEvent('pointerover', opts));
    el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
  }
}

// Identified by its "more_vert" icon ligature — locale-independent, unlike
// Flow's own menu labels.
function findMenuTrigger(tile: HTMLElement): HTMLButtonElement | null {
  const buttons = Array.from(tile.querySelectorAll<HTMLButtonElement>('button'));
  return buttons.find((b) => b.querySelector('mat-icon')?.textContent?.trim() === 'more_vert') || null;
}

// A tile's context menu isn't Flow's settings-panel overlay (that one
// carries a .settings-content class) — just [role="menu"].
function getVisibleMenu(): HTMLElement | null {
  const menus = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));
  return menus.find((m) => m.getBoundingClientRect().width > 0) || null;
}

export async function moveTileToTrash(tile: HTMLElement): Promise<boolean> {
  dispatchHoverEnter(tile);
  const menuBtn = await waitFor(() => findMenuTrigger(tile));
  if (!menuBtn) return false;
  fullClick(menuBtn);

  const menu = await waitFor(getVisibleMenu);
  if (!menu) return false;
  const deleteItem = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (item) => item.querySelector('mat-icon')?.textContent?.trim() === 'delete'
  );
  if (!deleteItem) return false;
  fullClick(deleteItem);
  return true;
}
