// Model/amount vocab shared between the content script (drives Flow's UI)
// and the background worker (validates persisted preferences).

export type NanoModelKey = 'pro' | '2' | '2lite';
export type VeoModelKey = 'quality' | 'fast' | 'lite';
export type Amount = 'x1' | 'x2' | 'x3' | 'x4';
export type Duration = '4s' | '6s' | '8s' | '10s';

export const NANO_BASE = 'Nano Banana';

export const NANO_MODELS: Record<NanoModelKey, string> = {
  pro: 'Nano Banana Pro',
  '2': 'Nano Banana 2',
  '2lite': 'Nano Banana 2 Lite',
};

export const VEO_MODELS: Record<VeoModelKey, string> = {
  quality: 'Veo 3.1 Quality',
  fast: 'Veo 3.1 Fast',
  lite: 'Veo 3.1 Lite',
};

// Omni Flash has no sibling variants, so its version number ("Omni 1.1
// Flash") is just noise to ignore, not a discriminator — it's matched
// loosely (see matchesModel in flow-dom.ts) unlike Nano Banana / Veo 3.1.
export const OMNI_MODEL = 'Omni Flash';

export const NANO_VARIANTS = Object.keys(NANO_MODELS) as NanoModelKey[];
export const VEO_VARIANTS = Object.keys(VEO_MODELS) as VeoModelKey[];
export const AMOUNTS: Amount[] = ['x1', 'x2', 'x3', 'x4'];
export const DURATIONS: Duration[] = ['4s', '6s', '8s', '10s'];
