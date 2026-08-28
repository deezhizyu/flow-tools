import { isBusy, setBusy } from './busy';
import { fullClick, nextPaint, waitFor } from './dom-utils';
import { getPromptBox, getPromptWidget } from './panel';

// The prompt editor (Slate) only picks up a script-set Range once its own
// selectionchange listener fires — a separately queued task, not
// synchronous with the Range change. Skipping this wait makes the editor
// act on its previous selection instead.
function waitForSelectionChange(timeout = 200): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      document.removeEventListener('selectionchange', done);
      clearTimeout(timer);
      resolve();
    };
    document.addEventListener('selectionchange', done);
    const timer = setTimeout(done, timeout);
  });
}

// Spans from the first text node to the last — selectNodeContents(box)
// points at container-level boundaries the editor doesn't map correctly.
function selectAllText(box: HTMLElement): Promise<void> {
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node as Text);
  if (!textNodes.length) return Promise.resolve();

  const first = textNodes[0];
  const last = textNodes[textNodes.length - 1];
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(last, last.length);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  const selectionChanged = waitForSelectionChange();
  selection?.addRange(range);
  return selectionChanged;
}

function dispatchDeleteBackward(box: HTMLElement): void {
  box.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'deleteContentBackward',
    })
  );
}

// Same as Backspace with everything selected — unlike Flow's own clear
// button, this doesn't also wipe uploaded reference images.
async function clearPromptText(box: HTMLElement): Promise<void> {
  await selectAllText(box);
  dispatchDeleteBackward(box);
  await nextPaint();

  if (box.textContent) {
    await selectAllText(box);
    dispatchDeleteBackward(box);
    await nextPaint();
  }
}

function insertPromptText(box: HTMLElement, text: string): void {
  box.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: text,
    })
  );
}

// The prompt box only accepts "beforeinput" events at its own tracked
// selection — execCommand and synthetic "paste" events are ignored.
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
    // First focus after a fresh page load can drop a synchronous
    // beforeinput before Flow's editor finishes initializing.
    await nextPaint();

    await clearPromptText(box);
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
      const icon = b.querySelector('i');
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
