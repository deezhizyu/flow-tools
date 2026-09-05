import { findReferencePreviewRoot, getReferencePreviewImageSrc } from '../flow-dom';
import { useElementHover } from './useElementHover';

export interface ReferenceHoverState {
  card: HTMLElement;
  imageSrc: string | null;
  visible: boolean;
}

export function useReferenceHover(): ReferenceHoverState | null {
  const hover = useElementHover(findReferencePreviewRoot, getReferencePreviewImageSrc);
  return hover && { card: hover.root, imageSrc: hover.payload, visible: hover.visible };
}
