import { fullClick, isVisible, waitFor } from './dom-utils';
import { getModelMenuButton, getPanel } from './panel';

// Label text sits directly against an <i> icon ligature with no separator,
// so a plain .textContent read fuses them into one token — walk text nodes
// and skip anything under an <i>.
export function modelLabelText(el: Element): string {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement && node.parentElement.closest('i')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const parts: string[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) parts.push(n.textContent || '');
  return parts.join(' ').trim();
}

// Flow reorders/relabels model names around punctuation, so matching is
// done on word sets rather than substrings.
function modelWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
  );
}

// Loose: every word of targetName must appear in text. Used to bucket a
// scanned label into the right overlay section without being tripped up
// by version-number suffixes.
export function textContainsModelWords(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return [...target].every((word) => actual.has(word));
}

// Exact: word sets must match. Scanned labels come from the same source
// and should compare byte-for-byte modulo icon-ligature noise.
function textMatchesModel(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return actual.size === target.size && [...target].every((word) => actual.has(word));
}

function matchesModel(el: Element, targetName: string): boolean {
  return textMatchesModel(modelLabelText(el), targetName);
}

// The model dropdown's items render into a portal, not necessarily under
// the panel itself.
function waitForMenuItems(): Promise<HTMLElement[] | null> {
  return waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(isVisible);
    return found.length ? found : null;
  });
}

// Returns whether it actually switched models — callers use this to skip
// the post-switch settle wait when nothing changed.
export async function selectModelIfNeeded(panel: HTMLElement, modelName: string): Promise<boolean> {
  const modelBtn = getModelMenuButton(panel);
  if (!modelBtn || matchesModel(modelBtn, modelName)) return false;

  fullClick(modelBtn);
  const items = await waitForMenuItems();
  const item = items?.find((i) => matchesModel(i, modelName));
  if (!item) return false;
  fullClick(item);
  await waitFor(() => {
    const btn = getPanel() && getModelMenuButton(getPanel()!);
    return btn && matchesModel(btn, modelName);
  });
  return true;
}

// Reads the dropdown's options without changing the selection: opens it,
// reads every item, then closes it via the same trigger click that opened
// it (Radix toggles on repeat clicks).
export async function scanModelNames(panel: HTMLElement): Promise<string[]> {
  const modelBtn = getModelMenuButton(panel);
  if (!modelBtn) return [];
  fullClick(modelBtn);
  const items = await waitForMenuItems();
  const names = (items || []).map((i) => modelLabelText(i)).filter(Boolean);
  fullClick(modelBtn);
  await waitFor(() => (document.querySelector('[role="menuitem"]') ? null : true), { timeout: 600 });
  return names;
}
