export type Amount = 'x1' | 'x2' | 'x3' | 'x4';
export const AMOUNTS: Amount[] = ['x1', 'x2', 'x3', 'x4'];

export type VideoMode = 'frames' | 'ingredients';

export type SectionId = 'nano' | 'veo' | 'omni';
export type SectionsExpanded = Record<SectionId, boolean>;
export const SECTION_IDS: SectionId[] = ['nano', 'veo', 'omni'];

export const NANO_BASE = 'Nano Banana';
export const VEO_BASE = 'Veo 3.1';
export const OMNI_BASE = 'Omni Flash';

export const FALLBACK_NANO_MODELS = ['Nano Banana Pro', 'Nano Banana 2', 'Nano Banana 2 Lite'];
export const FALLBACK_VEO_MODELS = ['Veo 3.1 - Quality', 'Veo 3.1 - Fast', 'Veo 3.1 - Lite'];

export interface ScannedModel {
  label: string;
  durations: string[];
  resolutions: string[];
}

export interface VideoModeScan {
  models: ScannedModel[];
}

export interface ScanActiveState {
  tab: 'image' | 'videocam';
  mode: VideoMode | null;
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
