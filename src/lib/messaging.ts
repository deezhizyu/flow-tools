// Typed message-passing layer between the content script and the
// background service worker, which owns chrome.storage.local access.

import type { Amount, ScanResult, SectionsExpanded, VideoMode } from './models';

export interface Point {
  x: number;
  y: number;
}

export interface Prefs {
  // Raw model labels exactly as Flow renders them (e.g. "Veo 3.1 - Fast"),
  // not a closed key union — the set of valid values is discovered live
  // from Flow's own menu, not known ahead of time.
  nanoModel: string;
  veoModel: string;
  // Frames/Ingredients is saved per video category — Veo and Omni Flash
  // are commonly used in different modes, so switching one shouldn't
  // disturb the other's remembered choice.
  veoVideoMode: VideoMode;
  omniVideoMode: VideoMode;
  veoAmount: Amount;
  omniAmount: Amount;
  // Omni Flash usually has only one variant, but a tier that exposes more
  // is saved like any other model pick — null means "no override, use
  // whatever the scan/overlay falls back to". Unlike veoModel, picking one
  // never applies live even if Omni is the active tab (see App.tsx) — it's
  // just remembered for next time.
  omniModel: string | null;
  // Omni's resolution ("quality") pick — saved like omniAmount, and same
  // rule: applied to Flow live only when Omni is actually the active tab,
  // never unconditionally just because a button was clicked while some
  // other model/tab was showing.
  omniResolution: string | null;
  overlayOpen: boolean;
  // Drag offset of the toggle button (and overlay, which moves with it)
  // from its default corner anchor — persisted so the widget stays where
  // the user last left it across page reloads.
  buttonOffset: Point;
  // Which of the overlay's collapsible groups are open, persisted so the
  // overlay reopens the way the user last arranged it.
  sectionsExpanded: SectionsExpanded;
  // Cached result of the last scan of Flow's own settings panel — once
  // this exists, the overlay reuses it on every later load instead of
  // rescanning (Flow's own model/tier lineup rarely changes session to
  // session); the refresh button always rescans and overwrites it.
  scan: ScanResult | null;
}

export const DEFAULT_PREFS: Prefs = {
  nanoModel: 'Nano Banana Pro',
  veoModel: 'Veo 3.1 - Fast',
  veoVideoMode: 'frames',
  omniVideoMode: 'frames',
  veoAmount: 'x1',
  omniAmount: 'x1',
  omniModel: null,
  omniResolution: null,
  overlayOpen: true,
  buttonOffset: { x: 0, y: 0 },
  sectionsExpanded: { nano: true, veo: true, omni: true },
  scan: null,
};

export type Message =
  | { type: 'GET_PREFS' }
  | { type: 'SET_PREF'; key: 'nanoModel'; value: string }
  | { type: 'SET_PREF'; key: 'veoModel'; value: string }
  | { type: 'SET_PREF'; key: 'veoVideoMode'; value: VideoMode }
  | { type: 'SET_PREF'; key: 'omniVideoMode'; value: VideoMode }
  | { type: 'SET_PREF'; key: 'veoAmount'; value: Amount }
  | { type: 'SET_PREF'; key: 'omniAmount'; value: Amount }
  | { type: 'SET_PREF'; key: 'overlayOpen'; value: boolean }
  | { type: 'SET_PREF'; key: 'omniModel'; value: string | null }
  | { type: 'SET_PREF'; key: 'omniResolution'; value: string | null }
  | { type: 'SET_PREF'; key: 'buttonOffset'; value: Point }
  | { type: 'SET_PREF'; key: 'sectionsExpanded'; value: SectionsExpanded }
  | { type: 'SET_PREF'; key: 'scan'; value: ScanResult };

// Every message handled here resolves with the resulting Prefs snapshot,
// so the caller can always sync its local state from the response.
export function sendMessage(message: Message): Promise<Prefs> {
  return chrome.runtime.sendMessage(message);
}
