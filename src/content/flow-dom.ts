// Drives Google Flow's own settings panel and prompt box programmatically.

import { NANO_BASE, type Amount, type Duration } from '../lib/models';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function nextPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function waitFor<T>(
  fn: () => T | null | undefined,
  { timeout = 2500, interval = 40 }: { timeout?: number; interval?: number } = {}
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const val = fn();
    if (val) return val;
    await sleep(interval);
  }
  return null;
}

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const e = el as HTMLElement;
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

// Flow's settings panel is built on Radix UI, which opens on pointerdown
// rather than "click" — a script-dispatched element.click() is a no-op, so
// a full trusted-like pointer/mouse sequence is simulated instead.
export function fullClick(el: Element | null): void {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

export function getPromptBox(): HTMLElement | null {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'));
  return boxes.find(isVisible) || null;
}

function getPromptContainer(box: HTMLElement): HTMLElement {
  return box.closest('div[class]')!.parentElement!.parentElement as HTMLElement;
}

// In "Frames" mode Flow inserts a Start/End row above the prompt box, so
// anchoring to box.getBoundingClientRect().top alone lands mid-widget.
// Climb from the box to the nearest ancestor that also contains the
// bottom-toolbar settings trigger — that ancestor spans the whole widget,
// top row included, in both modes.
export function getPromptWidget(box: HTMLElement): HTMLElement {
  const trigger = findMainTrigger();
  if (!trigger) return getPromptContainer(box);
  let el: HTMLElement | null = box;
  while (el && !el.contains(trigger)) {
    el = el.parentElement;
  }
  return el || getPromptContainer(box);
}

// The prompt bar's "clear" (X) button only exists while the box has
// content; its icon ligature is literally "close".
function findClearButton(container: HTMLElement): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.querySelector('i')?.textContent?.trim() === 'close'
    ) || null
  );
}

// The main settings trigger (bottom toolbar) is the only aria-haspopup
// button outside the panel itself whose icon ligature starts with "crop_"
// (aspect-ratio icon) — locale-independent, unlike its label text.
export function findMainTrigger(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]'));
  return (
    buttons.find((b) => {
      if (b.closest('.DropdownMenuContent')) return false;
      const icon = b.querySelector('i');
      return !!icon && icon.textContent!.trim().startsWith('crop_');
    }) || null
  );
}

export function getPanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.DropdownMenuContent'));
  return panels.find(isVisible) || null;
}

function getTabTriggers(panel: HTMLElement): HTMLButtonElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>('.flow_tab_slider_trigger'));
}

function clickTabByIcon(panel: HTMLElement, iconName: string): void {
  const btn = getTabTriggers(panel).find((b) => b.querySelector('i')?.textContent?.trim() === iconName);
  if (btn && btn.getAttribute('data-state') !== 'active') fullClick(btn);
}

function getModelMenuButton(panel: HTMLElement): HTMLButtonElement | null {
  return panel.querySelector('button[aria-haspopup="menu"]');
}

// Label text sits directly against an <i> icon ligature with no separator
// (e.g. "...Pro" followed by "arrow_drop_down"), so a plain .textContent
// read would fuse them into one unmatchable token. Walk text nodes and
// skip anything under an <i> to keep ligature names out of the result.
function modelLabelText(el: Element): string {
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
  return parts.join(' ');
}

// Flow reorders/relabels model names around punctuation (e.g. "Veo 3.1 -
// Fast"), so matching is done on word sets rather than substrings.
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

// Loose: every word of targetName must appear in text, extra words in
// text are ignored. Used to detect "is this some Nano Banana variant at
// all" and to match Omni Flash, whose version-number suffix should be
// ignored and which has no sibling variant to confuse it with.
export function textContainsModelWords(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return [...target].every((word) => actual.has(word));
}

// Exact: word sets must match exactly. Needed to tell Nano Banana Pro / 2
// / 2 Lite apart, where a loose check would treat "2" as a match for "2
// Lite" too.
function textMatchesModel(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return actual.size === target.size && [...target].every((word) => actual.has(word));
}

function matchesModel(el: Element, targetName: string, exact: boolean): boolean {
  const text = modelLabelText(el);
  return exact ? textMatchesModel(text, targetName) : textContainsModelWords(text, targetName);
}

// Duration buttons only exist under Omni Flash — Veo 3.1 hides them
// entirely — so the model must be corrected before picking a duration.
async function selectModelIfNeeded(panel: HTMLElement, modelName: string, exact: boolean): Promise<void> {
  const modelBtn = getModelMenuButton(panel);
  if (!modelBtn || matchesModel(modelBtn, modelName, exact)) return;

  fullClick(modelBtn);
  const items = await waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(isVisible);
    return found.length ? found : null;
  });
  const item = items?.find((i) => matchesModel(i, modelName, exact));
  if (!item) return;
  fullClick(item);
  await waitFor(() => {
    const btn = getPanel() && getModelMenuButton(getPanel()!);
    return btn && matchesModel(btn, modelName, exact);
  });
}

// Guards against a click landing mid-flight of a previous panel action,
// which would otherwise race the same panel/box.
let busy = false;

// Opens Flow's settings panel if needed, runs `work` against it, then
// closes it again — the shared shell around every panel interaction.
async function withPanel<T>(work: (panel: HTMLElement) => Promise<T>): Promise<T | undefined> {
  if (busy) return undefined;
  busy = true;
  try {
    let trigger = findMainTrigger();
    if (!trigger) return undefined;

    let panel = getPanel();
    if (!panel) {
      fullClick(trigger);
      panel = await waitFor(getPanel);
      if (!panel) return undefined;
    }

    const result = await work(panel);

    await sleep(80);
    trigger = findMainTrigger() || trigger;
    if (trigger && getPanel()) fullClick(trigger);
    return result;
  } finally {
    busy = false;
  }
}

export interface ApplyPresetOptions {
  tabIcon: 'image' | 'videocam';
  modelName: string;
  subText: Amount | Duration; // output-count row for Nano Banana/Veo, duration row for Omni Flash
  amount?: Amount; // Omni Flash's second click: output count, after duration
  modelMatch?: 'exact' | 'loose'; // 'exact' for Nano Banana/Veo siblings, 'loose' for Omni Flash
}

export async function applyPreset({
  tabIcon,
  modelName,
  subText,
  amount,
  modelMatch = 'exact',
}: ApplyPresetOptions): Promise<void> {
  await withPanel(async (openedPanel) => {
    clickTabByIcon(openedPanel, tabIcon);
    let panel = (await waitFor(getPanel)) || openedPanel;

    await selectModelIfNeeded(panel, modelName, modelMatch === 'exact');
    panel = (await waitFor(getPanel)) || panel;

    // The duration/count row can re-render a beat after the model switch
    // (switching models remounts the row), so poll for the target button
    // rather than assume it's already there — clicking early is a no-op.
    const fallbackPanel = panel;
    const targetBtn = await waitFor(() => {
      const p = getPanel() || fallbackPanel;
      return getTabTriggers(p).find((b) => b.textContent!.trim() === subText) || null;
    });
    if (targetBtn) fullClick(targetBtn);

    if (amount) {
      await sleep(80);
      panel = getPanel() || panel;
      const amountBtn = getTabTriggers(panel).find((b) => b.textContent!.trim() === amount);
      if (amountBtn) fullClick(amountBtn);
    }
  });
}

// Sets Omni Flash's output count directly, without touching tab or model
// — for use only when Omni Flash is already the active selection.
export async function applyOmniAmount(amount: Amount): Promise<void> {
  await withPanel(async (openedPanel) => {
    const amountBtn = await waitFor(() => {
      const p = getPanel() || openedPanel;
      return getTabTriggers(p).find((b) => b.textContent!.trim() === amount) || null;
    });
    if (amountBtn) fullClick(amountBtn);
  });
}

// The prompt box is a controlled rich-text editor that ignores
// document.execCommand and synthetic "paste" events, and only accepts a
// "beforeinput" event with inputType "insertText" — which always inserts
// at the editor's own tracked cursor, not a script-set Selection/Range. So
// existing content is cleared via Flow's own "X" button first, then the
// new text is inserted into the now-empty, cursor-at-start box.
export async function pasteFromClipboard(): Promise<void> {
  if (busy) return;
  busy = true;
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

    const container = getPromptContainer(box);
    const clearBtn = findClearButton(container);
    if (clearBtn) {
      fullClick(clearBtn);
      await waitFor(() => !findClearButton(container));
    }

    box.focus();
    // On the box's very first focus after a fresh page load, Flow's editor
    // hasn't finished initializing yet and drops a synchronous beforeinput
    // — waiting two frames lets that initialization land first.
    await nextPaint();
    box.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: text,
      })
    );
  } finally {
    busy = false;
  }
}

export interface TriggerSummary {
  count: Amount | null;
  duration: Duration | null;
  isNano: boolean;
  isVideo: boolean;
}

// The collapsed settings trigger always renders a live one-line summary of
// the current tab's settings, even while closed (e.g. "Nano Banana Pro
// x1" or "Video · 720p · 6s x1") — reading it lets the overlay mirror
// Flow's real selection without opening anything. A resolution marker
// ("720p") only ever appears on the video tab, and a duration ("6s")
// only under Omni Flash (Veo's summary omits it) — both locale-independent
// signals, unlike matching localized mode labels would be.
export function readTriggerSummary(): TriggerSummary | null {
  const trigger = findMainTrigger();
  if (!trigger) return null;
  const textParts = Array.from(trigger.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent!.trim())
    .filter(Boolean);
  const count = (textParts.find((t) => /^x\d+$/i.test(t)) as Amount | undefined) || null;
  const summary = textParts.find((t) => t !== count) || '';
  const durationMatch = summary.match(/\b(\d+)s\b/);
  return {
    count,
    duration: durationMatch ? (`${durationMatch[1]}s` as Duration) : null,
    isNano: textContainsModelWords(summary, NANO_BASE),
    isVideo: /\b\d+p\b/i.test(summary),
  };
}

export function isNanoActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isNano;
}

export function isVeoActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isVideo && !summary.duration;
}

export function isOmniActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isVideo && !!summary.duration;
}

// Caps the widget (menu button + textarea + other button, stacked) at
// 150px so a long prompt scrolls instead of growing the whole bar. Flow's
// own re-renders can overwrite this inline style, so it's reapplied every
// tick rather than set once.
export function applyWidgetMaxHeight(widget: HTMLElement | null): void {
  if (!widget) return;
  widget.style.maxHeight = '150px';
}
