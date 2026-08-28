import { NANO_MODELS, OMNI_MODEL, VEO_MODELS, type Amount, type Duration, type NanoModelKey, type VeoModelKey } from '../lib/models';
import { applyOmniAmount, applyPreset, isNanoActive, isOmniActive, isVeoActive, pasteFromClipboard } from './flow-dom';
import { Overlay } from './Overlay';
import { PasteButton } from './PasteButton';
import { useFlowSync } from './useFlowSync';
import { usePrefs } from './usePrefs';

export function App() {
  const { box, panelOpen, triggerSummary, pastePos } = useFlowSync();
  const { prefs, setNanoModel, setVeoModel, setOmniAmount } = usePrefs();

  if (!box) return null;

  // A model/amount switch only has somewhere to apply to once its category
  // is already the active selection in Flow — otherwise it's just saved
  // and rides along with the next click that opens that category's panel.
  function applyModelIfActive(active: boolean, tabIcon: 'image' | 'videocam', modelName: string) {
    if (!active || !triggerSummary?.count) return;
    applyPreset({ tabIcon, modelName, subText: triggerSummary.count, modelMatch: 'exact' });
  }

  function handleNanoModel(value: NanoModelKey) {
    setNanoModel(value);
    applyModelIfActive(isNanoActive(triggerSummary), 'image', NANO_MODELS[value]);
  }

  function handleVeoModel(value: VeoModelKey) {
    setVeoModel(value);
    applyModelIfActive(isVeoActive(triggerSummary), 'videocam', VEO_MODELS[value]);
  }

  function handleOmniAmount(amount: Amount) {
    setOmniAmount(amount);
    if (isOmniActive(triggerSummary)) applyOmniAmount(amount);
  }

  return (
    <>
      <Overlay
        prefs={prefs}
        triggerSummary={triggerSummary}
        onSetNanoModel={handleNanoModel}
        onSetVeoModel={handleVeoModel}
        onSetOmniAmount={handleOmniAmount}
        onImg={(amount: Amount) =>
          applyPreset({ tabIcon: 'image', modelName: NANO_MODELS[prefs.nanoModel], subText: amount, modelMatch: 'exact' })
        }
        onVid={(amount: Amount) =>
          applyPreset({ tabIcon: 'videocam', modelName: VEO_MODELS[prefs.veoModel], subText: amount, modelMatch: 'exact' })
        }
        onOmniDur={(duration: Duration) =>
          applyPreset({
            tabIcon: 'videocam',
            modelName: OMNI_MODEL,
            subText: duration,
            amount: prefs.omniAmount,
            modelMatch: 'loose',
          })
        }
      />
      {/* Flow's own settings panel opens directly above the prompt box —
          the same spot the paste button lives in — so hide it while that
          panel is open instead of letting the two overlap. */}
      {!panelOpen && pastePos && (
        <PasteButton top={pastePos.top} left={pastePos.left} onPaste={() => void pasteFromClipboard()} />
      )}
    </>
  );
}
