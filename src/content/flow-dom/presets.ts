import type { Amount, VideoMode } from '../../lib/models';
import { sleep } from '../../lib/async';
import { fullClick, waitFor } from './dom-utils';
import { selectModelIfNeeded } from './model-match';
import { clickTriggerByIcon, getPanel, getTriggers, VIDEO_MODE_ICON, waitForTriggerByText, withPanel } from './panel';

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
    clickTriggerByIcon(openedPanel, tabIcon);
    let panel = (await waitFor(getPanel)) || openedPanel;

    if (tabIcon === 'videocam' && mode) {
      clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
      panel = (await waitFor(getPanel)) || panel;
    }

    await selectModelIfNeeded(panel, modelName);
    panel = (await waitFor(getPanel)) || panel;

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
      await sleep(80);
      panel = getPanel() || panel;
      const amountBtn = getTriggers(panel).find((b) => b.textContent!.trim() === amount);
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
    clickTriggerByIcon(openedPanel, 'videocam');
    const panel = (await waitFor(getPanel)) || openedPanel;
    clickTriggerByIcon(panel, VIDEO_MODE_ICON[mode]);
  });
}
