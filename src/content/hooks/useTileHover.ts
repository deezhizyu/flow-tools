import { useEffect, useState } from 'preact/hooks';
import { findTileRoot, getTileMedia, type TileMedia } from '../flow-dom';

export interface TileHoverState {
  tile: HTMLElement;
  media: TileMedia | null;
  visible: boolean;
}

export function useTileHover(): TileHoverState | null {
  const [state, setState] = useState<TileHoverState | null>(null);

  useEffect(() => {
    function show(tile: HTMLElement) {
      setState({ tile, media: getTileMedia(tile), visible: true });
    }

    // Stays mounted at its last-known tile with visible:false rather than
    // unmounting outright, so the opacity/blur animation has something to
    // animate from (same trick as #fqs-widget's own show/hide fade). Our
    // buttons are portaled inside the tile itself (see TileQuickActions),
    // so this mouseout only ever fires for a genuine exit — no debounce
    // needed to bridge a gap to a separately-positioned overlay.
    function hide() {
      setState((prev) => (prev ? { ...prev, visible: false } : prev));
    }

    function onMouseOver(ev: MouseEvent) {
      const tile = findTileRoot(ev.target as Element);
      if (tile) show(tile);
    }

    function onMouseOut(ev: MouseEvent) {
      const leavingTile = findTileRoot(ev.target as Element);
      if (!leavingTile) return;
      const related = ev.relatedTarget as Element | null;
      if (related && findTileRoot(related) === leavingTile) return;
      hide();
    }

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  return state;
}
