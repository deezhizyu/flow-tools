// Hovering a reference chip — either one attached in the prompt's ingredient
// bar, or one listed under a past generation's "References" row — makes
// Angular mount a `flow-image-ingredient-preview` CDK overlay showing the
// same image larger. It's identified by its `.image-preview-card` class,
// which stays stable across both contexts.
export function findReferencePreviewRoot(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>('.image-preview-card');
}

export function getReferencePreviewImageSrc(root: HTMLElement): string | null {
  return root.querySelector<HTMLImageElement>('.card-image')?.src || null;
}
