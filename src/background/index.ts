// Sole owner of chrome.storage.local: the content script never touches
// storage directly, it asks over the messaging layer instead.

import { AMOUNTS, NANO_VARIANTS, VEO_VARIANTS } from '../lib/models';
import { DEFAULT_PREFS, type Message, type Prefs } from '../lib/messaging';

function isValidValue<K extends keyof Prefs>(key: K, value: unknown): value is Prefs[K] {
  switch (key) {
    case 'nanoModel':
      return (NANO_VARIANTS as unknown[]).includes(value);
    case 'veoModel':
      return (VEO_VARIANTS as unknown[]).includes(value);
    case 'omniAmount':
      return (AMOUNTS as unknown[]).includes(value);
    default:
      return false;
  }
}

async function getPrefs(): Promise<Prefs> {
  const stored = (await chrome.storage.local.get(DEFAULT_PREFS)) as Prefs;
  return {
    nanoModel: isValidValue('nanoModel', stored.nanoModel) ? stored.nanoModel : DEFAULT_PREFS.nanoModel,
    veoModel: isValidValue('veoModel', stored.veoModel) ? stored.veoModel : DEFAULT_PREFS.veoModel,
    omniAmount: isValidValue('omniAmount', stored.omniAmount) ? stored.omniAmount : DEFAULT_PREFS.omniAmount,
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
