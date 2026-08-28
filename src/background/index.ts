// Sole owner of chrome.storage.local: the content script never touches
// storage directly, it asks over the messaging layer instead.

import { AMOUNTS } from '../lib/models';
import { DEFAULT_PREFS, type Message, type Prefs } from '../lib/messaging';

// Model labels are discovered live from Flow's own menu (see scanFlow in
// the content script), so the background worker — which has no DOM access
// — can't validate them against a known set. It only checks shape.
function isValidModelLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 200;
}

function isValidVideoMode(value: unknown): value is Prefs['veoVideoMode'] {
  return value === 'frames' || value === 'ingredients';
}

function isValidValue<K extends keyof Prefs>(key: K, value: unknown): value is Prefs[K] {
  switch (key) {
    case 'nanoModel':
    case 'veoModel':
      return isValidModelLabel(value);
    case 'veoVideoMode':
    case 'omniVideoMode':
      return isValidVideoMode(value);
    case 'veoAmount':
    case 'omniAmount':
      return (AMOUNTS as unknown[]).includes(value);
    case 'overlayOpen':
      return typeof value === 'boolean';
    default:
      return false;
  }
}

async function getPrefs(): Promise<Prefs> {
  const stored = (await chrome.storage.local.get(DEFAULT_PREFS)) as Prefs;
  return {
    nanoModel: isValidValue('nanoModel', stored.nanoModel) ? stored.nanoModel : DEFAULT_PREFS.nanoModel,
    veoModel: isValidValue('veoModel', stored.veoModel) ? stored.veoModel : DEFAULT_PREFS.veoModel,
    veoVideoMode: isValidValue('veoVideoMode', stored.veoVideoMode) ? stored.veoVideoMode : DEFAULT_PREFS.veoVideoMode,
    omniVideoMode: isValidValue('omniVideoMode', stored.omniVideoMode) ? stored.omniVideoMode : DEFAULT_PREFS.omniVideoMode,
    veoAmount: isValidValue('veoAmount', stored.veoAmount) ? stored.veoAmount : DEFAULT_PREFS.veoAmount,
    omniAmount: isValidValue('omniAmount', stored.omniAmount) ? stored.omniAmount : DEFAULT_PREFS.omniAmount,
    overlayOpen: isValidValue('overlayOpen', stored.overlayOpen) ? stored.overlayOpen : DEFAULT_PREFS.overlayOpen,
  };
}

async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<Prefs> {
  if (isValidValue(key, value)) {
    await chrome.storage.local.set({ [key]: value });
  }
  return getPrefs();
}

async function handleMessage(message: Message): Promise<Prefs> {
  switch (message.type) {
    case 'GET_PREFS':
      return getPrefs();
    case 'SET_PREF':
      return setPref(message.key, message.value);
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // keep the message channel open for the async response
});
