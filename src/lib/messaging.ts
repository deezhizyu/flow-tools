// Typed message-passing layer between the content script and the
// background service worker, which owns chrome.storage.local access.

import type { Amount, NanoModelKey, VeoModelKey } from './models';

export interface Prefs {
  nanoModel: NanoModelKey;
  veoModel: VeoModelKey;
  omniAmount: Amount;
  overlayOpen: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  nanoModel: 'pro',
  veoModel: 'fast',
  omniAmount: 'x1',
  overlayOpen: true,
};

export type Message =
  | { type: 'GET_PREFS' }
  | { type: 'SET_PREF'; key: 'nanoModel'; value: NanoModelKey }
  | { type: 'SET_PREF'; key: 'veoModel'; value: VeoModelKey }
  | { type: 'SET_PREF'; key: 'omniAmount'; value: Amount }
  | { type: 'SET_PREF'; key: 'overlayOpen'; value: boolean };

// Every message handled here resolves with the resulting Prefs snapshot,
// so the caller can always sync its local state from the response.
export function sendMessage(message: Message): Promise<Prefs> {
  return chrome.runtime.sendMessage(message);
}
