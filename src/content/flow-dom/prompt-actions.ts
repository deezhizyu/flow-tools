import { isBusy, setBusy } from './busy';
import { fullClick, nextPaint, waitFor } from './dom-utils';
import { getPromptBox, getPromptWidget } from './panel';

// Flow's prompt box (ProseMirror) doesn't react to a script-dispatched
// "beforeinput" the way the previous Slate editor did — synthetic
// InputEvents have no working getTargetRanges(), which ProseMirror relies
// on. execCommand is deprecated but still routes through the browser's own
// editing commands, which ProseMirror does observe.
//
// Same as select-all + Backspace — unlike Flow's own clear button, this
// doesn't also wipe uploaded reference images (they live outside the
// contenteditable box).
function clearPromptText(box: HTMLElement): void {
  box.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
}

function insertPromptText(box: HTMLElement, text: string): void {
  box.focus();
  document.execCommand('insertText', false, text);
}

export async function pasteFromClipboard(): Promise<void> {
  if (isBusy()) return;
  setBusy(true);
  try {
    const box = getPromptBox();
    if (!box) return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    if (!text) return;

    box.focus();
    // First focus after a fresh page load can drop the insert before
    // Flow's editor finishes initializing.
    await nextPaint();

    clearPromptText(box);
    insertPromptText(box, text);
  } finally {
    setBusy(false);
  }
}

// Identified by its "close" icon ligature — locale-independent.
function findClearButton(scope: HTMLElement): HTMLButtonElement | null {
  const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>('button'));
  return (
    buttons.find((b) => {
      const icon = b.querySelector('mat-icon');
      return !!icon && icon.textContent!.trim() === 'close';
    }) || null
  );
}

export async function clearReferences(): Promise<void> {
  if (isBusy()) return;
  setBusy(true);
  try {
    const box = getPromptBox();
    if (!box) return;
    const widget = getPromptWidget(box);
    const clearBtn = findClearButton(widget);
    if (!clearBtn) return;

    const text = box.textContent || '';
    fullClick(clearBtn);
    if (!text) return;

    // Compares against the captured text rather than checking for empty —
    // Flow's placeholder can leave a stray invisible character.
    const clearedBox = await waitFor(
      () => {
        const b = getPromptBox();
        return b && b.textContent !== text ? b : null;
      },
      { timeout: 800 }
    );
    const targetBox = clearedBox || getPromptBox();
    if (!targetBox) return;

    targetBox.focus();
    await nextPaint();
    insertPromptText(targetBox, text);
  } finally {
    setBusy(false);
  }
}
