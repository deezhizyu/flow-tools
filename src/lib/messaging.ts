// Typed message-passing layer between the content script and the
// background service worker, which owns chrome.storage.local access.

import type { Amount, VideoMode } from './models';

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
  overlayOpen: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  nanoModel: 'Nano Banana Pro',
  veoModel: 'Veo 3.1 - Fast',
  veoVideoMode: 'frames',
  omniVideoMode: 'frames',
  veoAmount: 'x1',
  omniAmount: 'x1',
  overlayOpen: true,
};

export type Message =
  | { type: 'GET_PREFS' }
  | { type: 'SET_PREF'; key: 'nanoModel'; value: string }
  | { type: 'SET_PREF'; key: 'veoModel'; value: string }
  | { type: 'SET_PREF'; key: 'veoVideoMode'; value: VideoMode }
  | { type: 'SET_PREF'; key: 'omniVideoMode'; value: VideoMode }
  | { type: 'SET_PREF'; key: 'veoAmount'; value: Amount }
  | { type: 'SET_PREF'; key: 'omniAmount'; value: Amount }
  | { type: 'SET_PREF'; key: 'overlayOpen'; value: boolean };

// Every message handled here resolves with the resulting Prefs snapshot,
// so the caller can always sync its local state from the response.
export function sendMessage(message: Message): Promise<Prefs> {
  return chrome.runtime.sendMessage(message);
}
