import type { ComponentChildren } from 'preact';
import type { Prefs } from '../lib/messaging';
import {
  AMOUNTS,
  FALLBACK_NANO_MODELS,
  FALLBACK_VEO_MODELS,
  NANO_BASE,
  OMNI_BASE,
  VEO_BASE,
  type Amount,
  type ScanResult,
  type SectionId,
  type SectionsExpanded,
  type VideoMode,
} from '../lib/models';
import { textContainsModelWords } from './flow-dom';
import { usePressed } from './usePressed';

interface OverlayProps {
  prefs: Prefs;
  scan: ScanResult | null;
  visible: boolean;
  sectionsExpanded: SectionsExpanded;
  onToggleSection: (id: SectionId) => void;

  nanoActive: boolean;
  veoActive: boolean;
  omniActive: boolean;
  count: Amount | null; // shared across sections — meaningful only where *Active is true
  duration: string | null; // shared across the video sections — meaningful only where *Active is true
  resolution: string | null; // shared across the video sections — meaningful only where *Active is true

  onSetNanoModel: (label: string) => void;
  onSetVeoModel: (label: string) => void;
  onSetOmniModel: (label: string) => void;
  onSetVeoMode: (mode: VideoMode) => void;
  onSetOmniMode: (mode: VideoMode) => void;
  onSetVeoAmount: (value: Amount) => void;
  onSetOmniAmount: (value: Amount) => void;
  onImg: (amount: Amount) => void;
  onVeoDuration: (duration: string) => void;
  onVeoResolution: (resolution: string) => void;
  onOmniDuration: (modelLabel: string, duration: string) => void;
  onOmniResolution: (modelLabel: string, resolution: string) => void;
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// Verbose suffixes Flow renders in full but that don't fit a 4-across
// pill row — abbreviated for display only, matching is unaffected since
// it always happens against the untouched raw label.
const LABEL_ABBREVIATIONS: [RegExp, string][] = [[/\[Lower Priority\]/i, '[LP]']];

// Strips a scanned label's base-name words down to just the distinguishing
// part (e.g. "Veo 3.1 - Fast" + "Veo 3.1" -> "Fast") for compact button
// text — falls back to the full label if nothing distinguishing is left.
// Words are compared with punctuation stripped on both sides, so a base
// like "Veo 3.1" (raw word "3.1") still matches the label's own "3.1".
function shortLabel(label: string, base: string): string {
  const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const baseWords = new Set(base.split(/\s+/).filter(Boolean).map(normalize));
  let rest = label
    .split(/\s+/)
    .filter((w) => !baseWords.has(normalize(w)))
    .join(' ')
    .replace(/^[-–—:\s]+/, '')
    .trim();
  rest = rest || label;
  for (const [pattern, replacement] of LABEL_ABBREVIATIONS) rest = rest.replace(pattern, replacement);
  return rest;
}

function groupModels(labels: string[], base: string): string[] {
  return labels.filter((l) => textContainsModelWords(l, base));
}

function Section(props: {
  id: SectionId;
  label: string;
  expanded: boolean;
  onToggle: (id: SectionId) => void;
  children: ComponentChildren;
}) {
  return (
    <div class="fqs-group">
      <button type="button" class="fqs-section-toggle" aria-expanded={props.expanded} onClick={() => props.onToggle(props.id)}>
        <span>{props.label}</span>
        <span class="fqs-chevron google-symbols" aria-hidden="true">
          {props.expanded ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </button>
      <div class="fqs-section-body" hidden={!props.expanded}>
        {props.children}
      </div>
    </div>
  );
}

function PresetButton(props: { active: boolean; label: string; onPress: () => void }) {
  const [pressed, press] = usePressed();
  return (
    <button type="button" class={cx(props.active && 'fqs-active', pressed && 'fqs-pressed')} onClick={() => press(props.onPress)}>
      {props.label}
    </button>
  );
}

function PresetRow<T extends string>(props: {
  values: readonly T[];
  labels?: Record<T, string>;
  active: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div class="fqs-row">
      {props.values.map((value) => (
        <PresetButton key={value} label={props.labels?.[value] ?? value} active={props.active === value} onPress={() => props.onSelect(value)} />
      ))}
    </div>
  );
}

// Only worth a row once there's an actual choice — a single scanned/
// fallback variant renders as this category's implicit selection instead.
function ModelRow(props: { values: string[]; base: string; active: string | null; onSelect: (value: string) => void }) {
  if (props.values.length < 2) return null;
  const labels = Object.fromEntries(props.values.map((v) => [v, shortLabel(v, props.base)])) as Record<string, string>;
  return <PresetRow values={props.values} labels={labels} active={props.active} onSelect={props.onSelect} />;
}

const VIDEO_MODE_LABELS: Record<VideoMode, string> = { frames: 'Frames', ingredients: 'Ingredients' };
const VIDEO_MODES: VideoMode[] = ['frames', 'ingredients'];

function VideoModeRow(props: { active: VideoMode; onSelect: (mode: VideoMode) => void }) {
  return <PresetRow values={VIDEO_MODES} labels={VIDEO_MODE_LABELS} active={props.active} onSelect={props.onSelect} />;
}

export function Overlay(props: OverlayProps) {
  const { scan, prefs } = props;

  const nanoModels = scan ? groupModels(scan.imageModels, NANO_BASE) : [];
  const resolvedNanoModels = nanoModels.length ? nanoModels : FALLBACK_NANO_MODELS;

  const veoScanModels = scan?.video[prefs.veoVideoMode].models ?? [];
  const veoModels = groupModels(
    veoScanModels.map((m) => m.label),
    VEO_BASE
  );
  const resolvedVeoModels = veoModels.length ? veoModels : FALLBACK_VEO_MODELS;
  const veoScanModel = veoScanModels.find((m) => m.label === prefs.veoModel);
  const veoDurations = veoScanModel?.durations ?? [];
  const veoResolutions = veoScanModel?.resolutions ?? [];

  const omniScanModels = scan?.video[prefs.omniVideoMode].models ?? [];
  const resolvedOmniModels = groupModels(
    omniScanModels.map((m) => m.label),
    OMNI_BASE
  );
  const omniModels = resolvedOmniModels.length ? resolvedOmniModels : ['Omni Flash'];
  const omniModel = prefs.omniModel && omniModels.includes(prefs.omniModel) ? prefs.omniModel : omniModels[0];
  const omniScanModel = omniScanModels.find((m) => m.label === omniModel);
  const omniDurations = omniScanModel?.durations ?? [];
  const omniResolutions = omniScanModel?.resolutions ?? [];

  return (
    <div id="fqs-overlay" class={cx(!props.visible && 'fqs-hidden')}>
      <Section id="nano" label="Nano Banana" expanded={props.sectionsExpanded.nano} onToggle={props.onToggleSection}>
        <ModelRow values={resolvedNanoModels} base={NANO_BASE} active={prefs.nanoModel} onSelect={props.onSetNanoModel} />
        <PresetRow values={AMOUNTS} active={props.nanoActive ? props.count : null} onSelect={props.onImg} />
      </Section>

      <Section id="veo" label="Veo 3.1" expanded={props.sectionsExpanded.veo} onToggle={props.onToggleSection}>
        <VideoModeRow active={prefs.veoVideoMode} onSelect={props.onSetVeoMode} />
        <ModelRow values={resolvedVeoModels} base={VEO_BASE} active={prefs.veoModel} onSelect={props.onSetVeoModel} />
        {veoResolutions.length > 0 && (
          <PresetRow values={veoResolutions} active={props.veoActive ? props.resolution : null} onSelect={props.onVeoResolution} />
        )}
        {veoDurations.length > 0 && (
          <PresetRow values={veoDurations} active={props.veoActive ? props.duration : null} onSelect={props.onVeoDuration} />
        )}
        <PresetRow values={AMOUNTS} active={props.veoActive ? props.count : prefs.veoAmount} onSelect={props.onSetVeoAmount} />
      </Section>

      <Section id="omni" label={omniModel} expanded={props.sectionsExpanded.omni} onToggle={props.onToggleSection}>
        <VideoModeRow active={prefs.omniVideoMode} onSelect={props.onSetOmniMode} />
        <ModelRow values={omniModels} base={OMNI_BASE} active={omniModel} onSelect={props.onSetOmniModel} />
        {omniResolutions.length > 0 && (
          <PresetRow
            values={omniResolutions}
            active={props.omniActive ? props.resolution : prefs.omniResolution}
            onSelect={(resolution) => props.onOmniResolution(omniModel, resolution)}
          />
        )}
        {omniDurations.length > 0 && (
          <PresetRow
            values={omniDurations}
            active={props.omniActive ? props.duration : null}
            onSelect={(duration) => props.onOmniDuration(omniModel, duration)}
          />
        )}
        <PresetRow values={AMOUNTS} active={props.omniActive ? props.count : prefs.omniAmount} onSelect={props.onSetOmniAmount} />
      </Section>
    </div>
  );
}
