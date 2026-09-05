import type { Amount, VideoMode } from '../../lib/models';
import { fullClick, waitFor } from './dom-utils';
import { selectModelIfNeeded } from './model-match';
import { clickTriggerByIcon, getPanel, VIDEO_MODE_ICON, waitForStableTriggers, waitForTriggerByText, withPanel } from './panel';

export interface ApplyPresetOptions {
  tabIcon: 'image' | 'videocam';
  mode?: VideoMode;
  modelName: string;
  // Reasserted after selecting the model, since switching models resets
  // the resolution row to whatever Flow last used for it.
  resolution?: string;
  subText?: Amount | string; // duration or output-count row to click
  amount?: Amount; // second click after subText, e.g. duration then count
}

export async function applyPreset({ tabIcon, mode, modelName, resolution, subText, amount }: ApplyPresetOptions): Promise<void> {
  await withPanel(async (openedPanel) => {
    let panel = openedPanel;

    // Switching tab/mode re-renders the whole row set below (including the
    // model dropdown) a beat later — acting immediately can grab a button
    // that's about to be replaced, so only proceed once it settles.
    if (clickTriggerByIcon(panel, tabIcon)) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }

    if (tabIcon === 'videocam' && mode) {
      if (clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode])) {
        panel = (await waitFor(getPanel)) || panel;
        panel = await waitForStableTriggers(panel);
      }
    }

    if (await selectModelIfNeeded(panel, modelName)) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }

    // These rows can re-render a beat after the model switch, so poll
    // rather than assume they're already there.
    if (resolution) {
      const resolutionBtn = await waitForTriggerByText(panel, resolution);
      if (resolutionBtn) fullClick(resolutionBtn);
      panel = getPanel() || panel;
    }

    if (subText) {
      const targetBtn = await waitForTriggerByText(panel, subText);
      if (targetBtn) fullClick(targetBtn);
    }

    if (amount) {
      const amountBtn = await waitForTriggerByText(panel, amount);
      if (amountBtn) fullClick(amountBtn);
    }
  });
}

export async function applyAmount(amount: Amount): Promise<void> {
  await withPanel(async (openedPanel) => {
    const amountBtn = await waitForTriggerByText(openedPanel, amount);
    if (amountBtn) fullClick(amountBtn);
  });
}

export async function applyVideoMode(mode: VideoMode): Promise<void> {
  await withPanel(async (openedPanel) => {
    let panel = openedPanel;
    if (clickTriggerByIcon(panel, 'videocam')) {
      panel = (await waitFor(getPanel)) || panel;
      panel = await waitForStableTriggers(panel);
    }
    clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
  });
}
