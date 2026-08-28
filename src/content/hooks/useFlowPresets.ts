import { useEffect, useState } from 'preact/hooks';
import type { Prefs } from '../../lib/messaging';
import { OMNI_BASE, VEO_BASE, type Amount, type ScanResult, type VideoMode } from '../../lib/models';
import {
  applyAmount,
  applyPreset,
  applyVideoMode,
  isNanoActive,
  textContainsModelWords,
  type ApplyPresetOptions,
  type TriggerSummary,
} from '../flow-dom';

interface VideoActive {
  mode: VideoMode;
  modelLabel: string | null;
}

function categoryOf(label: string | null): 'veo' | 'omni' | null {
  if (!label) return null;
  if (textContainsModelWords(label, VEO_BASE)) return 'veo';
  if (textContainsModelWords(label, OMNI_BASE)) return 'omni';
  return null;
}

interface FlowPresetsDeps {
  prefs: Prefs;
  triggerSummary: TriggerSummary | null;
  scan: ScanResult | null;
  setNanoModel: (value: string) => void;
  setVeoModel: (value: string) => void;
  setOmniModel: (value: string | null) => void;
  setOmniResolution: (value: string | null) => void;
  setVeoVideoMode: (value: VideoMode) => void;
  setOmniVideoMode: (value: VideoMode) => void;
  setVeoAmount: (value: Amount) => void;
  setOmniAmount: (value: Amount) => void;
}

export interface FlowPresets {
  nanoActive: boolean;
  veoActive: boolean;
  omniActive: boolean;
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

// Tracks which video model/mode is actually live in Flow (the collapsed
// trigger alone can't tell Veo and Omni apart once both show a duration),
// and translates every overlay interaction into apply-if-active +
// save-for-later.
export function useFlowPresets(deps: FlowPresetsDeps): FlowPresets {
  const { prefs, triggerSummary, scan } = deps;
  const [videoActive, setVideoActive] = useState<VideoActive>({ mode: 'frames', modelLabel: null });

  useEffect(() => {
    if (scan && scan.active.tab === 'videocam' && scan.active.mode) {
      setVideoActive({ mode: scan.active.mode, modelLabel: scan.active.modelLabel });
    }
  }, [scan]);

  const nanoActive = isNanoActive(triggerSummary);
  const activeVideoCategory = triggerSummary?.isVideo ? categoryOf(videoActive.modelLabel) : null;
  const veoActive = activeVideoCategory === 'veo';
  const omniActive = activeVideoCategory === 'omni';

  // Only applies live once its category is already the active selection
  // in Flow — otherwise it's just saved for the next click that opens it.
  function applyModelIfActive(active: boolean, tabIcon: 'image' | 'videocam', modelName: string, mode?: VideoMode) {
    if (!active || !triggerSummary?.count) return;
    applyPreset({ tabIcon, mode, modelName, subText: triggerSummary.count });
  }

  function applyVideoPreset(options: ApplyPresetOptions, mode: VideoMode, modelLabel: string): void {
    applyPreset(options);
    setVideoActive({ mode, modelLabel });
  }

  function onSetNanoModel(label: string) {
    deps.setNanoModel(label);
    applyModelIfActive(nanoActive, 'image', label);
  }

  function onSetVeoModel(label: string) {
    deps.setVeoModel(label);
    if (veoActive) {
      setVideoActive({ mode: prefs.veoVideoMode, modelLabel: label });
      applyModelIfActive(true, 'videocam', label, prefs.veoVideoMode);
    }
  }

  // Unlike Veo's model, Omni's pick is only ever remembered, never applied
  // live — matches the omniModel pref (see lib/messaging.ts).
  function onSetOmniModel(label: string) {
    deps.setOmniModel(label);
  }

  function onSetVeoMode(mode: VideoMode) {
    deps.setVeoVideoMode(mode);
    if (veoActive) {
      setVideoActive({ mode, modelLabel: videoActive.modelLabel });
      void applyVideoMode(mode);
    }
  }

  function onSetOmniMode(mode: VideoMode) {
    deps.setOmniVideoMode(mode);
    if (omniActive) {
      setVideoActive({ mode, modelLabel: videoActive.modelLabel });
      void applyVideoMode(mode);
    }
  }

  function onSetVeoAmount(amount: Amount) {
    deps.setVeoAmount(amount);
    if (veoActive) void applyAmount(amount);
  }

  function onSetOmniAmount(amount: Amount) {
    deps.setOmniAmount(amount);
    if (omniActive) void applyAmount(amount);
  }

  // Only pushed to Flow live if Omni is the active tab — otherwise
  // clicking a resolution while e.g. Veo is showing would switch Flow's
  // live tab/model out from under the user.
  function onOmniResolution(modelLabel: string, resolution: string) {
    deps.setOmniResolution(resolution);
    if (omniActive) {
      applyVideoPreset({ tabIcon: 'videocam', mode: prefs.omniVideoMode, modelName: modelLabel, subText: resolution }, prefs.omniVideoMode, modelLabel);
    }
  }

  function onImg(amount: Amount) {
    applyPreset({ tabIcon: 'image', modelName: prefs.nanoModel, subText: amount });
  }

  function onVeoDuration(duration: string) {
    applyVideoPreset(
      { tabIcon: 'videocam', mode: prefs.veoVideoMode, modelName: prefs.veoModel, subText: duration, amount: prefs.veoAmount },
      prefs.veoVideoMode,
      prefs.veoModel
    );
  }

  function onVeoResolution(resolution: string) {
    applyVideoPreset(
      { tabIcon: 'videocam', mode: prefs.veoVideoMode, modelName: prefs.veoModel, subText: resolution },
      prefs.veoVideoMode,
      prefs.veoModel
    );
  }

  function onOmniDuration(modelLabel: string, duration: string) {
    applyVideoPreset(
      {
        tabIcon: 'videocam',
        mode: prefs.omniVideoMode,
        modelName: modelLabel,
        // Switching into Omni resets its resolution row — reassert the
        // saved pick, or it silently reverts.
        resolution: prefs.omniResolution ?? undefined,
        subText: duration,
        amount: prefs.omniAmount,
      },
      prefs.omniVideoMode,
      modelLabel
    );
  }

  return {
    nanoActive,
    veoActive,
    omniActive,
    onSetNanoModel,
    onSetVeoModel,
    onSetOmniModel,
    onSetVeoMode,
    onSetOmniMode,
    onSetVeoAmount,
    onSetOmniAmount,
    onImg,
    onVeoDuration,
    onVeoResolution,
    onOmniDuration,
    onOmniResolution,
  };
}
