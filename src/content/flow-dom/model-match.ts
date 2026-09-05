import { elementLabelText, fullClick, isVisible, waitFor } from './dom-utils';
import { getModelMenuButton, getPanel } from './panel';

export const modelLabelText = elementLabelText;

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

// Loose: every word of targetName must appear in text — buckets a scanned
// label into the right overlay section without tripping on version suffixes.
export function textContainsModelWords(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return [...target].every((word) => actual.has(word));
}

// Exact: word sets must match — scanned labels come from the same source
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

// Opens the dropdown, reads every item, then closes it via the same
// trigger click that opened it (Radix toggles open/closed on repeat clicks).
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
