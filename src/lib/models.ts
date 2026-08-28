// Model names and their per-tier options are NOT hardcoded here — they're
// discovered live by scanning Flow's own settings panel (see scanFlow),
// so the overlay stays correct as Flow's lineup changes. Only values
// stable enough to hardcode live below.

export type Amount = 'x1' | 'x2' | 'x3' | 'x4';
export const AMOUNTS: Amount[] = ['x1', 'x2', 'x3', 'x4'];

export type VideoMode = 'frames' | 'ingredients';

export type SectionId = 'nano' | 'veo' | 'omni';
export type SectionsExpanded = Record<SectionId, boolean>;
export const SECTION_IDS: SectionId[] = ['nano', 'veo', 'omni'];

// Bucket names for scanned model labels, matched loosely by word set so
// version-number drift (e.g. "Omni 1.1 Flash" -> "1.2") doesn't break
// grouping.
export const NANO_BASE = 'Nano Banana';
export const VEO_BASE = 'Veo 3.1';
export const OMNI_BASE = 'Omni Flash';

// Initial-paint placeholders before the first scan resolves.
export const FALLBACK_NANO_MODELS = ['Nano Banana Pro', 'Nano Banana 2', 'Nano Banana 2 Lite'];
export const FALLBACK_VEO_MODELS = ['Veo 3.1 - Quality', 'Veo 3.1 - Fast', 'Veo 3.1 - Lite'];

// Shape of a live scan of Flow's panel — lives here (not in flow-dom) so
// the background worker can validate a persisted scan without pulling in
// DOM-manipulation code.
export interface ScannedModel {
  label: string; // e.g. "Veo 3.1 - Fast"
  durations: string[]; // e.g. ["4s","6s","8s"] — empty if this model has none
  resolutions: string[]; // e.g. ["360p","720p"] — empty if this model has none
}

export interface VideoModeScan {
  models: ScannedModel[];
}

export interface ScanActiveState {
  tab: 'image' | 'videocam';
  mode: VideoMode | null; // null when tab is 'image'
  modelLabel: string | null;
  resolution: string | null;
  duration: string | null;
  amount: string | null;
}

export interface ScanResult {
  imageModels: string[];
  video: Record<VideoMode, VideoModeScan>;
  active: ScanActiveState;
  scannedAt: number;
}
