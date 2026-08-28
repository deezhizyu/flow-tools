import { NANO_MODELS, OMNI_MODEL, VEO_MODELS, type Amount, type Duration, type NanoModelKey, type VeoModelKey } from '../lib/models';
import { applyOmniAmount, applyPreset, isNanoActive, isOmniActive, isVeoActive, pasteFromClipboard } from './flow-dom';
import { Overlay } from './Overlay';
import { PasteButton } from './PasteButton';
import { ToggleButton } from './ToggleButton';
import { useDraggable } from './useDraggable';
import { useFlowSync } from './useFlowSync';
import { usePrefs } from './usePrefs';

// Matches #fqs-widget's fixed bottom/right in style.css — used to derive
// the button's actual screen position from the drag offset alone, without
// a DOM measurement.
const WIDGET_ANCHOR = 16;

// Once dragged into the top half of the screen, the overlay (which by
// default opens upward from the button) would run off the top edge — flip
// it to open downward instead. Same idea horizontally: past the left half,
// right-aligning it against the button would push it off the left edge, so
// left-align it against the button instead.
function computePlacement(offset: { x: number; y: number }) {
  const buttonRight = window.innerWidth - WIDGET_ANCHOR + offset.x;
  const buttonBottom = window.innerHeight - WIDGET_ANCHOR + offset.y;
  return {
    openBelow: buttonBottom < window.innerHeight / 2,
    alignLeft: buttonRight < window.innerWidth / 2,
  };
}

export function App() {
  const { box, panelOpen, triggerSummary, pastePos } = useFlowSync();
  const { prefs, setNanoModel, setVeoModel, setOmniAmount, setOverlayOpen } = usePrefs();
  const { offset, onPointerDown, onPointerMove, onPointerUp } = useDraggable();

  if (!box) return null;

  const { openBelow, alignLeft } = computePlacement(offset);
  const widgetClass = [openBelow && 'fqs-open-below', alignLeft && 'fqs-align-left'].filter(Boolean).join(' ');

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
      <div id="fqs-widget" class={widgetClass} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <ToggleButton
          open={prefs.overlayOpen}
          onToggle={() => setOverlayOpen(!prefs.overlayOpen)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        {prefs.overlayOpen && (
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
        )}
      </div>
      {/* Flow's own settings panel opens directly above the prompt box —
          the same spot the paste button lives in — so hide it while that
          panel is open instead of letting the two overlap. */}
      {!panelOpen && pastePos && (
        <PasteButton top={pastePos.top} left={pastePos.left} onPaste={() => void pasteFromClipboard()} />
      )}
    </>
  );
}
