import type { VideoMode } from '../../lib/models';
import { sleep } from '../../lib/async';
import { isBusy, setBusy } from './busy';
import { fullClick, isVisible, waitFor } from './dom-utils';

export function getPromptBox(): HTMLElement | null {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'));
  return boxes.find(isVisible) || null;
}

function getPromptContainer(box: HTMLElement): HTMLElement {
  return box.closest('div[class]')!.parentElement!.parentElement as HTMLElement;
}

// The only aria-haspopup button outside the panel whose icon ligature
// starts with "crop_" (aspect ratio) — locale-independent, unlike its
// label text.
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

// Frames mode inserts a Start/End row above the prompt box, so the widget's
// top edge isn't box.getBoundingClientRect().top — climb to the nearest
// ancestor that also contains the main trigger, which spans the whole
// widget in both modes.
export function getPromptWidget(box: HTMLElement, trigger = findMainTrigger()): HTMLElement {
  if (!trigger) return getPromptContainer(box);
  let el: HTMLElement | null = box;
  while (el && !el.contains(trigger)) {
    el = el.parentElement;
  }
  return el || getPromptContainer(box);
}

export function getPanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.DropdownMenuContent'));
  return panels.find(isVisible) || null;
}

// Every panel row (tabs, mode, aspect ratio, resolution, duration, amount)
// is a `.flow_tab_slider_trigger`. Icon rows carry an <i> ligature; the
// plain-text rows don't (see is*Text below).
export function getTriggers(panel: HTMLElement): HTMLButtonElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>('.flow_tab_slider_trigger'));
}

export function triggerIcon(btn: HTMLButtonElement): string | null {
  return btn.querySelector('i')?.textContent?.trim() || null;
}

// Reports whether it actually clicked (vs. the row already being active),
// so callers can skip the settle wait when nothing changed.
export function clickTriggerByIcon(panel: HTMLElement, iconName: string): boolean {
  const btn = getTriggers(panel).find((b) => triggerIcon(b) === iconName);
  if (!btn || btn.getAttribute('data-state') === 'active') return false;
  fullClick(btn);
  return true;
}

export function clickTriggerByText(panel: HTMLElement, text: string): void {
  const btn = getTriggers(panel).find((b) => !triggerIcon(b) && b.textContent!.trim() === text);
  if (btn && btn.getAttribute('data-state') !== 'active') fullClick(btn);
}

export function activeTriggerText(panel: HTMLElement, matches: (text: string) => boolean): string | null {
  const btn = getTriggers(panel).find(
    (b) => !triggerIcon(b) && b.getAttribute('data-state') === 'active' && matches(b.textContent!.trim())
  );
  return btn ? btn.textContent!.trim() : null;
}

export function allTriggerTexts(panel: HTMLElement, matches: (text: string) => boolean): string[] {
  return getTriggers(panel)
    .filter((b) => !triggerIcon(b) && matches(b.textContent!.trim()))
    .map((b) => b.textContent!.trim());
}

// Digits are locale-independent, unlike matching a translated label.
export const isDurationText = (t: string) => /^\d+s$/i.test(t);
export const isResolutionText = (t: string) => /^\d+p$/i.test(t);
export const isAmountText = (t: string) => /^x\d+$/i.test(t);

export const VIDEO_MODE_ICON: Record<VideoMode, string> = { frames: 'crop_free', ingredients: 'chrome_extension' };

export function getModelMenuButton(panel: HTMLElement): HTMLButtonElement | null {
  return panel.querySelector('button[aria-haspopup="menu"]');
}

// After a model switch, Flow remounts the resolution/duration/amount rows
// a beat later — rather than guess a fixed delay, resolve once the row
// text stops changing for `quiet` ms, so this waits exactly as long as
// each model's re-render actually takes. `timeout` is a hard ceiling.
export function waitForStableTriggers(
  panel: HTMLElement,
  { timeout = 700, quiet = 60 }: { timeout?: number; quiet?: number } = {}
): Promise<HTMLElement> {
  const readTriggers = (p: HTMLElement) =>
    getTriggers(p)
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

// Tolerates the panel element itself being remounted mid-wait by
// re-resolving getPanel() on every check, falling back to `fallbackPanel`.
export function waitForTriggerByText(fallbackPanel: HTMLElement, text: string): Promise<HTMLButtonElement | null> {
  return waitFor(() => {
    const panel = getPanel() || fallbackPanel;
    return getTriggers(panel).find((b) => b.textContent!.trim() === text) || null;
  });
}

// Every panel interaction below visibly flickers Flow's real panel open —
// this class hides it via CSS instead of styling element references
// directly, since a tab switch mid-operation can remount it.
function setAutomating(active: boolean): void {
  document.body.classList.toggle('fqs-automating', active);
}

export async function withPanel<T>(work: (panel: HTMLElement) => Promise<T>): Promise<T | undefined> {
  if (isBusy()) return undefined;
  setBusy(true);
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
    setBusy(false);
  }
}
