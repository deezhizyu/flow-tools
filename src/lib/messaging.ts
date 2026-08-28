import type { Amount, ScanResult, SectionsExpanded, VideoMode } from './models';

export interface Point {
  x: number;
  y: number;
}

export interface Prefs {
  nanoModel: string;
  veoModel: string;
  veoVideoMode: VideoMode;
  omniVideoMode: VideoMode;
  veoAmount: Amount;
  omniAmount: Amount;
  // Unlike veoModel, this is never applied to Flow live even when Omni is
  // the active tab — just remembered for next time.
  omniModel: string | null;
  omniResolution: string | null;
  overlayOpen: boolean;
  buttonOffset: Point;
  sectionsExpanded: SectionsExpanded;
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

export function sendMessage(message: Message): Promise<Prefs> {
  return chrome.runtime.sendMessage(message);
}
