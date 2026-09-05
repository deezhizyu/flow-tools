import { NANO_BASE, type Amount } from '../../lib/models';
import { elementLabelText } from './dom-utils';
import { textContainsModelWords } from './model-match';
import { findMainTrigger } from './panel';

export interface TriggerSummary {
  count: Amount | null;
  duration: string | null;
  resolution: string | null;
  isNano: boolean;
  isVideo: boolean;
}

// The collapsed trigger renders a live summary of the current tab's
// settings in a ".settings-summary" span (e.g. "Nano Banana Pro x2" or
// "Video · 720p · 6s x2") — reading it mirrors Flow's selection without
// opening the panel.
export function readTriggerSummary(trigger = findMainTrigger()): TriggerSummary | null {
  if (!trigger) return null;
  const summary = elementLabelText(trigger.querySelector('.settings-summary') ?? trigger);
  const countMatch = summary.match(/\bx(\d+)\b/i);
  const resolutionMatch = summary.match(/\b(\d+p)\b/i);
  // Duration's unit is localized ("6s" in English, "6 с" in Ukrainian) and
  // resolution ("720p") comes first in the summary and fits the same
  // "digits + short suffix" shape — matchAll (not match) so the resolution
  // token doesn't stop the search before the duration token is reached. The
  // full match (not just the captured groups) is kept as the duration
  // value, so a locale that renders a space before the unit ("6 с") still
  // matches the duration row's own label text exactly. A trailing lookahead
  // is used instead of \b: \b is defined against ASCII \w only (even with
  // the u flag), so it never matches right after a Cyrillic letter.
  const durationMatch = [...summary.matchAll(/\b(\d+)\s*([a-zа-яё]{1,3})(?=\s|$)/giu)].find((m) => m[2].toLowerCase() !== 'p');
  return {
    count: countMatch ? (`x${countMatch[1]}` as Amount) : null,
    duration: durationMatch ? durationMatch[0] : null,
    resolution: resolutionMatch ? resolutionMatch[1] : null,
    isNano: textContainsModelWords(summary, NANO_BASE),
    isVideo: !!resolutionMatch,
  };
}

export function isNanoActive(summary: TriggerSummary | null): boolean {
  return !!summary && summary.isNano;
}
