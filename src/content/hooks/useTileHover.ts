import { findTileRoot, getTileMedia, type TileMedia } from '../flow-dom';
import { useElementHover } from './useElementHover';

export interface TileHoverState {
  tile: HTMLElement;
  media: TileMedia | null;
  visible: boolean;
}

export function useTileHover(): TileHoverState | null {
  const hover = useElementHover(findTileRoot, getTileMedia);
  return hover && { tile: hover.root, media: hover.payload, visible: hover.visible };
}
