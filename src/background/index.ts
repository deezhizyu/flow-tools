import { AMOUNTS, SECTION_IDS, type ScanActiveState, type ScannedModel, type VideoModeScan } from '../lib/models';
import { DEFAULT_PREFS, type Message, type Prefs } from '../lib/messaging';

// No DOM access here, so labels can only be shape-checked, not matched
// against Flow's live menu.
function isValidModelLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 200;
}

function isValidVideoMode(value: unknown): value is Prefs['veoVideoMode'] {
  return value === 'frames' || value === 'ingredients';
}

function isValidPoint(value: unknown): value is Prefs['buttonOffset'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Prefs['buttonOffset']).x === 'number' &&
    typeof (value as Prefs['buttonOffset']).y === 'number'
  );
}

function isValidSectionsExpanded(value: unknown): value is Prefs['sectionsExpanded'] {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return SECTION_IDS.every((id) => typeof v[id] === 'boolean');
}

function isValidScannedModel(value: unknown): value is ScannedModel {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.label === 'string' &&
    Array.isArray(v.durations) &&
    v.durations.every((d) => typeof d === 'string') &&
    Array.isArray(v.resolutions) &&
    v.resolutions.every((r) => typeof r === 'string')
  );
}

function isValidVideoModeScan(value: unknown): value is VideoModeScan {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.models) && v.models.every(isValidScannedModel);
}

function isValidScanActiveState(value: unknown): value is ScanActiveState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.tab === 'image' || v.tab === 'videocam') &&
    (v.mode === null || isValidVideoMode(v.mode)) &&
    (v.modelLabel === null || typeof v.modelLabel === 'string') &&
    (v.resolution === null || typeof v.resolution === 'string') &&
    (v.duration === null || typeof v.duration === 'string') &&
    (v.amount === null || typeof v.amount === 'string')
  );
}

function isValidScanResult(value: unknown): value is Prefs['scan'] {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const video = v.video as Record<string, unknown> | undefined;
  return (
    Array.isArray(v.imageModels) &&
    v.imageModels.every((m) => typeof m === 'string') &&
    typeof video === 'object' &&
    video !== null &&
    isValidVideoModeScan(video.frames) &&
    isValidVideoModeScan(video.ingredients) &&
    isValidScanActiveState(v.active) &&
    typeof v.scannedAt === 'number'
  );
}

function isValidValue<K extends keyof Prefs>(key: K, value: unknown): value is Prefs[K] {
  switch (key) {
    case 'nanoModel':
    case 'veoModel':
      return isValidModelLabel(value);
    case 'omniModel':
    case 'omniResolution':
      return value === null || isValidModelLabel(value);
    case 'veoVideoMode':
    case 'omniVideoMode':
      return isValidVideoMode(value);
    case 'veoAmount':
    case 'omniAmount':
      return (AMOUNTS as unknown[]).includes(value);
    case 'overlayOpen':
      return typeof value === 'boolean';
    case 'buttonOffset':
      return isValidPoint(value);
    case 'sectionsExpanded':
      return isValidSectionsExpanded(value);
    case 'scan':
      return isValidScanResult(value);
    default:
      return false;
  }
}

async function getPrefs(): Promise<Prefs> {
  const stored = (await chrome.storage.local.get(DEFAULT_PREFS)) as Prefs;
  const prefs = {} as Prefs;
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
    (prefs as Record<keyof Prefs, unknown>)[key] = isValidValue(key, stored[key]) ? stored[key] : DEFAULT_PREFS[key];
  }
  return prefs;
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
