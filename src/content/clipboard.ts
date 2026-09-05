import { requestImageDataUrl } from '../lib/messaging';

// The clipboard API only accepts a handful of MIME types for images (PNG,
// not Flow's JPEG source), so the fetched bytes are re-encoded via canvas.
async function toPngBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

export async function copyImageToClipboard(src: string): Promise<void> {
  const dataUrl = await requestImageDataUrl(src);
  if (!dataUrl) return;
  const blob = await (await fetch(dataUrl)).blob();
  const pngBlob = await toPngBlob(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}
