import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Prefs } from '../lib/messaging';
import {
  AMOUNTS,
  DURATIONS,
  NANO_VARIANTS,
  VEO_VARIANTS,
  type Amount,
  type Duration,
  type NanoModelKey,
  type VeoModelKey,
} from '../lib/models';
import { isNanoActive, isOmniActive, isVeoActive, type TriggerSummary } from './flow-dom';
import { usePressed } from './usePressed';

const NANO_LABELS: Record<NanoModelKey, string> = { pro: 'Pro', '2': '2', '2lite': '2 Lite' };
const VEO_LABELS: Record<VeoModelKey, string> = { quality: 'Quality', fast: 'Fast', lite: 'Lite' };

interface OverlayProps {
  prefs: Prefs;
  triggerSummary: TriggerSummary | null;
  onSetNanoModel: (value: NanoModelKey) => void;
  onSetVeoModel: (value: VeoModelKey) => void;
  onSetOmniAmount: (value: Amount) => void;
  onImg: (amount: Amount) => void;
  onVid: (amount: Amount) => void;
  onOmniDur: (duration: Duration) => void;
}

type SectionId = 'nano' | 'veo' | 'omni';

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
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

function PresetRow<T extends string>(props: { values: readonly T[]; labels?: Record<T, string>; active: T | null; onSelect: (value: T) => void }) {
  return (
    <div class="fqs-row">
      {props.values.map((value) => (
        <PresetButton key={value} label={props.labels?.[value] ?? value} active={props.active === value} onPress={() => props.onSelect(value)} />
      ))}
    </div>
  );
}

export function Overlay(props: OverlayProps) {
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({ nano: true, veo: true, omni: true });
  const toggle = (id: SectionId) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const summary = props.triggerSummary;
  const nanoCount = isNanoActive(summary) ? summary!.count : null;
  const veoCount = isVeoActive(summary) ? summary!.count : null;
  const omniDuration = isOmniActive(summary) ? summary!.duration : null;

  return (
    <div id="fqs-overlay">
      <Section id="nano" label="Nano Banana" expanded={expanded.nano} onToggle={toggle}>
        <PresetRow values={NANO_VARIANTS} labels={NANO_LABELS} active={props.prefs.nanoModel} onSelect={props.onSetNanoModel} />
        <PresetRow values={AMOUNTS} active={nanoCount} onSelect={props.onImg} />
      </Section>

      <Section id="veo" label="Veo 3.1" expanded={expanded.veo} onToggle={toggle}>
        <PresetRow values={VEO_VARIANTS} labels={VEO_LABELS} active={props.prefs.veoModel} onSelect={props.onSetVeoModel} />
        <PresetRow values={AMOUNTS} active={veoCount} onSelect={props.onVid} />
      </Section>

      <Section id="omni" label="Omni Flash" expanded={expanded.omni} onToggle={toggle}>
        <PresetRow values={DURATIONS} active={omniDuration} onSelect={props.onOmniDur} />
        <PresetRow values={AMOUNTS} active={props.prefs.omniAmount} onSelect={props.onSetOmniAmount} />
      </Section>
    </div>
  );
}
