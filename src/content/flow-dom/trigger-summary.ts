import { NANO_BASE, type Amount } from '../../lib/models';
import { textContainsModelWords } from './model-match';
import { findMainTrigger } from './panel';

export interface TriggerSummary {
  count: Amount | null;
  duration: string | null;
  resolution: string | null;
  isNano: boolean;
  isVideo: boolean;
}

// The collapsed trigger always renders a live summary of the current tab's
// settings (e.g. "Nano Banana Pro x1" or "Video · 720p · 6s x1"), so
// reading it mirrors Flow's selection without opening the panel. A
// resolution marker only appears on the video tab — locale-independent,
// unlike matching localized mode labels. Note: it can't tell Veo and Omni
// apart once a tier gives Veo a duration too — see useFlowPresets.
export function readTriggerSummary(trigger = findMainTrigger()): TriggerSummary | null {
  if (!trigger) return null;
  const textParts = Array.from(trigger.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent!.trim())
    .filter(Boolean);
  const count = (textParts.find((t) => /^x\d+$/i.test(t)) as Amount | undefined) || null;
  const summary = textParts.find((t) => t !== count) || '';
  const durationMatch = summary.match(/\b(\d+s)\b/i);
  const resolutionMatch = summary.match(/\b(\d+p)\b/i);
  return {
    count,
    duration: durationMatch ? durationMatch[1] : null,
    resolution: resolutionMatch ? resolutionMatch[1] : null,
    isNano: textContainsModelWords(summary, NANO_BASE),
    isVideo: !!resolutionMatch,
  };
}

export function isNanoActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isNano;
}
