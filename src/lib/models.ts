// Model/amount vocab shared between the content script (drives Flow's UI)
// and the background worker (validates persisted preferences).
//
// Model names and their per-tier options (variants, length availability)
// are NOT hardcoded here — they're discovered live by scanning Flow's own
// settings panel (see scanFlow in flow-dom.ts), so the overlay stays
// correct as Flow ships new variants or changes what's available per
// subscription tier. Only the handful of values below are stable enough
// (or impossible to discover any other way) to hardcode.

export type Amount = 'x1' | 'x2' | 'x3' | 'x4';
export const AMOUNTS: Amount[] = ['x1', 'x2', 'x3', 'x4'];

export type VideoMode = 'frames' | 'ingredients';

// Base names used only to bucket scanned model labels (e.g. "Veo 3.1 -
// Fast") into the right overlay section — matched loosely by word set, so
// version-number/suffix drift (e.g. "Omni 1.1 Flash" -> "Omni 1.2 Flash")
// doesn't break grouping.
export const NANO_BASE = 'Nano Banana';
export const VEO_BASE = 'Veo 3.1';
export const OMNI_BASE = 'Omni Flash';

// Used only as an initial-paint placeholder before the first scan
// resolves — replaced with live scan data as soon as it's available.
export const FALLBACK_NANO_MODELS = ['Nano Banana Pro', 'Nano Banana 2', 'Nano Banana 2 Lite'];
export const FALLBACK_VEO_MODELS = ['Veo 3.1 - Quality', 'Veo 3.1 - Fast', 'Veo 3.1 - Lite'];
