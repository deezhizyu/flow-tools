// Drives Google Flow's own settings panel and prompt box programmatically.

import {
  NANO_BASE,
  type Amount,
  type ScanActiveState,
  type ScannedModel,
  type ScanResult,
  type VideoMode,
  type VideoModeScan,
} from '../lib/models';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function nextPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

// Resolves the instant `fn` starts returning a truthy value, rather than
// polling on a fixed interval and paying up to that interval's worth of
// latency on every single wait — every condition here is driven by Flow's
// own DOM (a panel/menu appearing, a label updating), so a MutationObserver
// on the whole document reacts as fast as the browser can tell us
// something changed. Checked once immediately (covers a condition that's
// already true, or one whose change wouldn't itself trigger a mutation),
// then re-checked on every subsequent mutation, with `timeout` as a safety
// net against a condition that never arrives.
function waitFor<T>(fn: () => T | null | undefined, { timeout = 2500 }: { timeout?: number } = {}): Promise<T | null> {
  return new Promise((resolve) => {
    const immediate = fn();
    if (immediate) {
      resolve(immediate);
      return;
    }
    let done = false;
    const finish = (val: T | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(val);
    };
    const observer = new MutationObserver(() => {
      const val = fn();
      if (val) finish(val);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    const timer = setTimeout(() => finish(fn() ?? null), timeout);
  });
}

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const e = el as HTMLElement;
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

// After a model switch, Flow remounts the resolution/duration/amount rows
// a beat after the model button's own label updates — reading a scan
// immediately after selectModelIfNeeded resolves can catch that row
// mid-remount (e.g. see it as empty right before its duration options
// appear). Rather than guess a fixed delay, watch mutations under the
// panel and resolve once the trigger row's text stops changing for `quiet`
// ms, so scanning waits exactly as long as each model's re-render actually
// takes — including models that settle on having no duration row at all,
// which is itself a real, final state. `timeout` is a hard ceiling in case
// something never settles.
function waitForStableTriggers(
  panel: HTMLElement,
  { timeout = 700, quiet = 60 }: { timeout?: number; quiet?: number } = {}
): Promise<HTMLElement> {
  const readTriggers = (p: HTMLElement) =>
    Array.from(p.querySelectorAll<HTMLButtonElement>('.flow_tab_slider_trigger'))
      .map((b) => `${b.getAttribute('data-state')}:${b.textContent!.trim()}`)
      .join('|');

  return new Promise((resolve) => {
    let current = panel;
    let last = readTriggers(current);
    let done = false;
    let quietTimer: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(overallTimer);
      resolve(current);
    };
    const armQuietTimer = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quiet);
    };

    const observer = new MutationObserver(() => {
      const p = getPanel() || current;
      const now = readTriggers(p);
      current = p;
      if (now !== last) {
        last = now;
        armQuietTimer();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    armQuietTimer();
    const overallTimer = setTimeout(finish, timeout);
  });
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

// Every row in the panel — top tabs (image/video), the Frames/Ingredients
// mode row, aspect ratio, resolution, duration, and amount — renders as a
// `.flow_tab_slider_trigger` button. Icon rows (tabs, mode, aspect ratio)
// carry an <i> ligature; plain-text rows (resolution/duration/amount)
// don't, and are told apart by their text shape (see is*Text below).
function getTriggers(panel: HTMLElement): HTMLButtonElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>('.flow_tab_slider_trigger'));
}

function triggerIcon(btn: HTMLButtonElement): string | null {
  return btn.querySelector('i')?.textContent?.trim() || null;
}

// Returns whether it actually clicked something (vs. that row already
// being the active one) — callers use this to skip the settle wait
// entirely when nothing was there to unsettle in the first place.
function clickTriggerByIcon(panel: HTMLElement, iconName: string): boolean {
  const btn = getTriggers(panel).find((b) => triggerIcon(b) === iconName);
  if (!btn || btn.getAttribute('data-state') === 'active') return false;
  fullClick(btn);
  return true;
}

function clickTriggerByText(panel: HTMLElement, text: string): void {
  const btn = getTriggers(panel).find((b) => !triggerIcon(b) && b.textContent!.trim() === text);
  if (btn && btn.getAttribute('data-state') !== 'active') fullClick(btn);
}

function activeTriggerText(panel: HTMLElement, matches: (text: string) => boolean): string | null {
  const btn = getTriggers(panel).find(
    (b) => !triggerIcon(b) && b.getAttribute('data-state') === 'active' && matches(b.textContent!.trim())
  );
  return btn ? btn.textContent!.trim() : null;
}

function allTriggerTexts(panel: HTMLElement, matches: (text: string) => boolean): string[] {
  return getTriggers(panel)
    .filter((b) => !triggerIcon(b) && matches(b.textContent!.trim()))
    .map((b) => b.textContent!.trim());
}

// Duration/resolution/amount rows are told apart by their text shape alone
// — digits are locale-independent, unlike matching a translated label.
const isDurationText = (t: string) => /^\d+s$/i.test(t);
const isResolutionText = (t: string) => /^\d+p$/i.test(t);
const isAmountText = (t: string) => /^x\d+$/i.test(t);

const VIDEO_MODE_ICON: Record<VideoMode, string> = { frames: 'crop_free', ingredients: 'chrome_extension' };

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
  return parts.join(' ').trim();
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
// text are ignored. Used to bucket a scanned model label into the right
// overlay section (e.g. "is this label some Nano Banana variant at all")
// without being tripped up by version-number suffixes like Omni's.
export function textContainsModelWords(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return [...target].every((word) => actual.has(word));
}

// Exact: word sets must match exactly. Scanned labels are matched against
// each other this way, since they come from the same source (Flow's own
// menu) and should compare byte-for-byte modulo icon-ligature noise.
function textMatchesModel(text: string, targetName: string): boolean {
  const target = modelWords(targetName);
  const actual = modelWords(text);
  return actual.size === target.size && [...target].every((word) => actual.has(word));
}

function matchesModel(el: Element, targetName: string): boolean {
  return textMatchesModel(modelLabelText(el), targetName);
}

// Duration buttons only exist under models that support picking a length
// — which model has this at all depends on the account's subscription
// tier, so the model must be corrected before reading/picking a duration.
// Returns whether it actually clicked a different model — callers use
// this to skip the post-switch settle wait entirely when nothing changed.
async function selectModelIfNeeded(panel: HTMLElement, modelName: string): Promise<boolean> {
  const modelBtn = getModelMenuButton(panel);
  if (!modelBtn || matchesModel(modelBtn, modelName)) return false;

  fullClick(modelBtn);
  const items = await waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(isVisible);
    return found.length ? found : null;
  });
  const item = items?.find((i) => matchesModel(i, modelName));
  if (!item) return false;
  fullClick(item);
  await waitFor(() => {
    const btn = getPanel() && getModelMenuButton(getPanel()!);
    return btn && matchesModel(btn, modelName);
  });
  return true;
}

// Reads the model dropdown's options without changing the current
// selection — opens it, reads every menu item's label, then closes it via
// the same trigger click that opened it (Radix toggles on repeat clicks,
// same as the main panel trigger does).
async function scanModelNames(panel: HTMLElement): Promise<string[]> {
  const modelBtn = getModelMenuButton(panel);
  if (!modelBtn) return [];
  fullClick(modelBtn);
  const items = await waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(isVisible);
    return found.length ? found : null;
  });
  const names = (items || []).map((i) => modelLabelText(i)).filter(Boolean);
  fullClick(modelBtn);
  await waitFor(() => (document.querySelector('[role="menuitem"]') ? null : true), { timeout: 600 });
  return names;
}

// Guards against a click landing mid-flight of a previous panel action,
// which would otherwise race the same panel/box.
let busy = false;

// Every withPanel-driven interaction (a single preset click as much as a
// full scan) opens Flow's real settings panel and clicks through it —
// visible, distracting flicker if left alone. Toggling this class hides
// whatever panel is currently open/opening via CSS (see style.css) rather
// than opacity-styling individual panel element references, since a tab
// switch mid-operation can remount the panel into a brand new element.
function setAutomating(active: boolean): void {
  document.body.classList.toggle('fqs-automating', active);
}

// Opens Flow's settings panel if needed, runs `work` against it, then
// closes it again — the shared shell around every panel interaction.
async function withPanel<T>(work: (panel: HTMLElement) => Promise<T>): Promise<T | undefined> {
  if (busy) return undefined;
  busy = true;
  setAutomating(true);
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

    await sleep(50);
    trigger = findMainTrigger() || trigger;
    if (trigger && getPanel()) fullClick(trigger);
    return result;
  } finally {
    setAutomating(false);
    busy = false;
  }
}

export interface ApplyPresetOptions {
  tabIcon: 'image' | 'videocam';
  mode?: VideoMode; // required to pick a video model's variant/duration correctly
  modelName: string;
  // Resolution to (re)assert right after selecting the model — needed
  // because switching models resets the resolution row to whatever Flow
  // last used for it, so a saved resolution preference has to be replayed
  // here every time, not just when the resolution row itself was clicked.
  resolution?: string;
  subText?: Amount | string; // duration or output-count row to click
  amount?: Amount; // second click after subText, e.g. duration then count
}

export async function applyPreset({ tabIcon, mode, modelName, resolution, subText, amount }: ApplyPresetOptions): Promise<void> {
  await withPanel(async (openedPanel) => {
    clickTriggerByIcon(openedPanel, tabIcon);
    let panel = (await waitFor(getPanel)) || openedPanel;

    if (tabIcon === 'videocam' && mode) {
      clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
      panel = (await waitFor(getPanel)) || panel;
    }

    await selectModelIfNeeded(panel, modelName);
    panel = (await waitFor(getPanel)) || panel;

    if (resolution) {
      // Same remount concern as subText below — poll rather than assume.
      const fallbackPanel = panel;
      const resolutionBtn = await waitFor(() => {
        const p = getPanel() || fallbackPanel;
        return getTriggers(p).find((b) => b.textContent!.trim() === resolution) || null;
      });
      if (resolutionBtn) fullClick(resolutionBtn);
      panel = getPanel() || panel;
    }

    if (subText) {
      // The duration/count row can re-render a beat after the model switch
      // (switching models remounts the row), so poll for the target button
      // rather than assume it's already there — clicking early is a no-op.
      const fallbackPanel = panel;
      const targetBtn = await waitFor(() => {
        const p = getPanel() || fallbackPanel;
        return getTriggers(p).find((b) => b.textContent!.trim() === subText) || null;
      });
      if (targetBtn) fullClick(targetBtn);
    }

    if (amount) {
      await sleep(80);
      panel = getPanel() || panel;
      const amountBtn = getTriggers(panel).find((b) => b.textContent!.trim() === amount);
      if (amountBtn) fullClick(amountBtn);
    }
  });
}

// Sets the output count directly on whichever model/tab is already active,
// without touching tab, mode, or model.
export async function applyAmount(amount: Amount): Promise<void> {
  await withPanel(async (openedPanel) => {
    const amountBtn = await waitFor(() => {
      const p = getPanel() || openedPanel;
      return getTriggers(p).find((b) => b.textContent!.trim() === amount) || null;
    });
    if (amountBtn) fullClick(amountBtn);
  });
}

// Switches the video tab's Frames/Ingredients mode directly, without
// touching the model or its other settings.
export async function applyVideoMode(mode: VideoMode): Promise<void> {
  await withPanel(async (openedPanel) => {
    clickTriggerByIcon(openedPanel, 'videocam');
    const panel = (await waitFor(getPanel)) || openedPanel;
    clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
  });
}

// ---- Live scan of Flow's own menu --------------------------------------
//
// Rather than hardcode which model variants exist and which of them
// support picking a length, this opens Flow's settings panel and reads it
// directly — so the overlay always matches what's actually offered on the
// current account's subscription tier, and survives Flow adding/removing/
// renaming variants without needing a code change here. Its result type
// (ScanResult and friends) lives in lib/models.ts so the background worker
// can validate a persisted scan without pulling in this file's DOM code.

function snapshotActiveState(panel: HTMLElement): ScanActiveState {
  const tab: 'image' | 'videocam' =
    getTriggers(panel).find((b) => triggerIcon(b) === 'videocam')?.getAttribute('data-state') === 'active'
      ? 'videocam'
      : 'image';
  const mode: VideoMode | null =
    tab === 'videocam'
      ? getTriggers(panel).find((b) => triggerIcon(b) === VIDEO_MODE_ICON.frames)?.getAttribute('data-state') ===
        'active'
        ? 'frames'
        : 'ingredients'
      : null;
  const modelBtn = getModelMenuButton(panel);
  return {
    tab,
    mode,
    modelLabel: modelBtn ? modelLabelText(modelBtn) : null,
    resolution: activeTriggerText(panel, isResolutionText),
    duration: activeTriggerText(panel, isDurationText),
    amount: activeTriggerText(panel, isAmountText),
  };
}

// Replays a snapshot's tab/mode/model/duration/amount selection, so a scan
// (which must click through every model and mode to read their options)
// leaves the live project exactly as it found it.
async function restoreActiveState(panel: HTMLElement, snap: ScanActiveState): Promise<void> {
  clickTriggerByIcon(panel, snap.tab);
  panel = (await waitFor(getPanel)) || panel;

  if (snap.mode) {
    clickTriggerByIcon(panel, VIDEO_MODE_ICON[snap.mode]);
    panel = (await waitFor(getPanel)) || panel;
  }
  if (snap.modelLabel) {
    const switched = await selectModelIfNeeded(panel, snap.modelLabel);
    panel = (await waitFor(getPanel)) || panel;
    if (switched) panel = await waitForStableTriggers(panel);
  }
  if (snap.resolution) {
    clickTriggerByText(panel, snap.resolution);
    panel = (await waitFor(getPanel)) || panel;
  }
  if (snap.duration) {
    clickTriggerByText(panel, snap.duration);
    panel = (await waitFor(getPanel)) || panel;
  }
  if (snap.amount) {
    clickTriggerByText(panel, snap.amount);
  }
}

async function scanVideoMode(panel: HTMLElement, mode: VideoMode): Promise<{ panel: HTMLElement; scan: VideoModeScan }> {
  const modeSwitched = clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
  if (modeSwitched) {
    panel = (await waitFor(getPanel)) || panel;
    panel = await waitForStableTriggers(panel);
  }

  const names = await scanModelNames(panel);
  const models: ScannedModel[] = [];
  for (const name of names) {
    // The user closing Flow's own menu mid-scan is the normal way this
    // gets interrupted — bail out of the remaining models immediately
    // rather than let each one grind through its own full wait for a
    // panel that isn't coming back (scanFlow's retry picks it up again).
    if (!getPanel()) break;
    const switched = await selectModelIfNeeded(panel, name);
    panel = (await waitFor(getPanel)) || panel;
    if (switched) panel = await waitForStableTriggers(panel);
    models.push({
      label: name,
      durations: allTriggerTexts(panel, isDurationText),
      resolutions: allTriggerTexts(panel, isResolutionText),
    });
  }
  return { panel, scan: { models } };
}

export async function scanFlow(): Promise<ScanResult | null> {
  const result = await withPanel(async (openedPanel) => {
    const snap = snapshotActiveState(openedPanel);
    let panel = openedPanel;

    clickTriggerByIcon(panel, 'image');
    panel = (await waitFor(getPanel)) || panel;
    if (!getPanel()) return null;
    const imageModels = await scanModelNames(panel);
    if (!getPanel()) return null;

    clickTriggerByIcon(panel, 'videocam');
    panel = (await waitFor(getPanel)) || panel;
    if (!getPanel()) return null;

    const framesResult = await scanVideoMode(panel, 'frames');
    panel = framesResult.panel;
    if (!getPanel()) return null;
    const ingredientsResult = await scanVideoMode(panel, 'ingredients');
    panel = ingredientsResult.panel;
    if (!getPanel()) return null;

    await restoreActiveState(panel, snap);

    const scan: ScanResult = {
      imageModels,
      video: { frames: framesResult.scan, ingredients: ingredientsResult.scan },
      active: snap,
      scannedAt: Date.now(),
    };
    return scan;
  });
  return result ?? null;
}

// Resolves on the next selectionchange event, or after `timeout` ms if none
// arrives. This editor (Slate) mirrors its own internal selection from the
// DOM's selectionchange event rather than reading window.getSelection()
// live — a script-set Range only reaches it once that event actually
// fires, which is a separately queued task, not synchronous with the Range
// change. Skipping this wait is exactly what made earlier attempts here
// silently no-op: the editor still saw its previous (or no) selection by
// the time the next beforeinput arrived.
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

// Selects the box's entire text — spanning from the start of its first
// text node to the end of its last, not the box's own container-level
// boundary (selectNodeContents(box) points at child-index boundaries
// rather than into actual text, which the editor doesn't map correctly) —
// so a single delete below can clear it in one shot instead of one
// "deleteContentBackward" beforeinput per character. No-ops if the box has
// no text yet.
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

// Removes the box's own existing text: selects all of it (see
// selectAllText) then fires one "deleteContentBackward" beforeinput, same
// as pressing Backspace once with everything selected — rather than
// Flow's own bar-wide "clear" (X) button, which also wipes any uploaded
// ingredients/frame images well beyond just the prompt text. A leftover
// check with one retry covers the rare case the editor doesn't clear the
// full selection in one go.
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

// The prompt box is a controlled rich-text editor that ignores
// document.execCommand and synthetic "paste" events, and only accepts
// "beforeinput" events (inputType "insertText" to type, "deleteContentBackward"
// to backspace) applied at the editor's own tracked selection. So existing
// text is cleared via clearPromptText above before the new text is
// inserted.
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

    box.focus();
    // On the box's very first focus after a fresh page load, Flow's editor
    // hasn't finished initializing yet and drops a synchronous beforeinput
    // — waiting two frames lets that initialization land first.
    await nextPaint();

    await clearPromptText(box);

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
  duration: string | null;
  resolution: string | null;
  isNano: boolean;
  isVideo: boolean;
}

// The collapsed settings trigger always renders a live one-line summary of
// the current tab's settings, even while closed (e.g. "Nano Banana Pro
// x1" or "Video · 720p · 6s x1") — reading it lets the overlay mirror
// Flow's real selection without opening anything. A resolution marker
// ("720p") only ever appears on the video tab — a locale-independent
// signal, unlike matching localized mode labels would be. Note: on tiers
// where Veo also has a length option, this summary can't tell Veo and
// Omni Flash apart by duration presence alone anymore — the overlay
// tracks which video model is active separately (via the scan snapshot
// and its own optimistic updates) rather than relying on this text for
// that distinction.
export function readTriggerSummary(): TriggerSummary | null {
  const trigger = findMainTrigger();
  if (!trigger) return null;
  const textParts = Array.from(trigger.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent!.trim())
    .filter(Boolean);
  const count = (textParts.find((t) => /^x\d+$/i.test(t)) as Amount | undefined) || null;
  const summary = textParts.find((t) => t !== count) || '';
  const durationMatch = summary.match(/\b(\d+s)\b/i);
  const resolutionMatch = summary.match(/\b(\d+p)\b/i);
  return {
    count,
    duration: durationMatch ? durationMatch[1] : null,
    resolution: resolutionMatch ? resolutionMatch[1] : null,
    isNano: textContainsModelWords(summary, NANO_BASE),
    isVideo: !!resolutionMatch,
  };
}

export function isNanoActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isNano;
}

// The prompt box's own scroll wrapper — the ancestor Flow marks with
// data-scroll-state, one level above the contenteditable div itself —
// wraps just the textbox, not the wider Frames/Ingredients row above it.
// Capping height there instead of on the whole widget lets a long prompt
// scroll internally without cutting off the ingredients thumbnails.
export function getPromptScrollContainer(box: HTMLElement): HTMLElement | null {
  return box.parentElement?.closest('[data-scroll-state]') ?? null;
}

// Caps the prompt box's scroll container at 150px so a long prompt scrolls
// instead of growing the whole bar. Flow's own re-renders can overwrite
// this inline style, so it's reapplied every tick rather than set once.
export function applyPromptMaxHeight(container: HTMLElement | null): void {
  if (!container) return;
  container.style.maxHeight = '100px';
}
