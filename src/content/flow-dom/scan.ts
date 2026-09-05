import type { ScanActiveState, ScannedModel, ScanResult, VideoMode, VideoModeScan } from '../../lib/models';
import { modelLabelText, scanModelNames, selectModelIfNeeded } from './model-match';
import { waitFor } from './dom-utils';
import {
  activeTriggerText,
  allTriggerTexts,
  clickTriggerByIcon,
  clickTriggerByText,
  getModelMenuButton,
  getPanel,
  getTriggers,
  isAmountText,
  isDurationText,
  isResolutionText,
  isTriggerActive,
  triggerIcon,
  VIDEO_MODE_ICON,
  waitForStableTriggers,
  withPanel,
} from './panel';

function snapshotActiveState(panel: HTMLElement): ScanActiveState {
  const videocamBtn = getTriggers(panel).find((b) => triggerIcon(b) === 'videocam');
  const tab: 'image' | 'videocam' = videocamBtn && isTriggerActive(videocamBtn) ? 'videocam' : 'image';
  const framesBtn = getTriggers(panel).find((b) => triggerIcon(b) === VIDEO_MODE_ICON.frames);
  const mode: VideoMode | null = tab === 'videocam' ? (framesBtn && isTriggerActive(framesBtn) ? 'frames' : 'ingredients') : null;
  const modelBtn = getModelMenuButton(panel);
  return {
    tab,
    mode,
    modelLabel: modelBtn ? modelLabelText(modelBtn) : null,
    resolution: activeTriggerText(panel, isResolutionText),
    duration: activeTriggerText(panel, isDurationText),
    amount: activeTriggerText(panel, isAmountText),
  };
}

async function restoreActiveState(panel: HTMLElement, snap: ScanActiveState): Promise<void> {
  if (clickTriggerByIcon(panel, snap.tab)) {
    panel = (await waitFor(getPanel)) || panel;
    panel = await waitForStableTriggers(panel);
  }

  if (snap.mode) {
    if (clickTriggerByIcon(panel, VIDEO_MODE_ICON[snap.mode])) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }
  }
  if (snap.modelLabel) {
    const switched = await selectModelIfNeeded(panel, snap.modelLabel);
    panel = (await waitFor(getPanel)) || panel;
    if (switched) panel = await waitForStableTriggers(panel);
  }
  if (snap.resolution) {
    clickTriggerByText(panel, snap.resolution);
    panel = (await waitFor(getPanel)) || panel;
  }
  if (snap.duration) {
    clickTriggerByText(panel, snap.duration);
    panel = (await waitFor(getPanel)) || panel;
  }
  if (snap.amount) {
    clickTriggerByText(panel, snap.amount);
  }
}

async function scanVideoMode(panel: HTMLElement, mode: VideoMode): Promise<{ panel: HTMLElement; scan: VideoModeScan }> {
  const modeSwitched = clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
  if (modeSwitched) {
    panel = (await waitFor(getPanel)) || panel;
    panel = await waitForStableTriggers(panel);
  }

  const names = await scanModelNames(panel);
  const models: ScannedModel[] = [];
  for (const name of names) {
    // The user closing Flow's menu mid-scan is the normal interruption —
    // bail immediately rather than wait out a panel that isn't coming back.
    if (!getPanel()) break;
    const switched = await selectModelIfNeeded(panel, name);
    panel = (await waitFor(getPanel)) || panel;
    if (switched) panel = await waitForStableTriggers(panel);
    models.push({
      label: name,
      durations: allTriggerTexts(panel, isDurationText),
      resolutions: allTriggerTexts(panel, isResolutionText),
    });
  }
  return { panel, scan: { models } };
}

export async function scanFlow(): Promise<ScanResult | null> {
  const result = await withPanel(async (openedPanel) => {
    const snap = snapshotActiveState(openedPanel);
    let panel = openedPanel;

    if (clickTriggerByIcon(panel, 'image')) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }
    if (!getPanel()) return null;
    const imageModels = await scanModelNames(panel);
    if (!getPanel()) return null;

    if (clickTriggerByIcon(panel, 'videocam')) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }
    if (!getPanel()) return null;

    const framesResult = await scanVideoMode(panel, 'frames');
    panel = framesResult.panel;
    if (!getPanel()) return null;
    const ingredientsResult = await scanVideoMode(panel, 'ingredients');
    panel = ingredientsResult.panel;
    if (!getPanel()) return null;

    await restoreActiveState(panel, snap);

    const scan: ScanResult = {
      imageModels,
      video: { frames: framesResult.scan, ingredients: ingredientsResult.scan },
      active: snap,
      scannedAt: Date.now(),
    };
    return scan;
  });
  return result ?? null;
}
