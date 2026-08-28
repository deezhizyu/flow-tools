import { useEffect, useState } from 'preact/hooks';
import { OMNI_BASE, VEO_BASE, type Amount, type VideoMode } from '../lib/models';
import {
  applyAmount,
  applyPreset,
  applyVideoMode,
  clearReferences,
  isNanoActive,
  pasteFromClipboard,
  textContainsModelWords,
} from './flow-dom';
import { ClearRefsButton } from './ClearRefsButton';
import { Overlay } from './Overlay';
import { PasteButton } from './PasteButton';
import { ToggleButton } from './ToggleButton';
import { useDraggable } from './useDraggable';
import { useFlowSync } from './useFlowSync';
import { useModelScan } from './useModelScan';
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

export function App() {
  const { box, panelOpen, triggerSummary, pastePos, clearRefsPos } = useFlowSync();
  const {
    prefs,
    loaded: prefsLoaded,
    setNanoModel,
    setVeoModel,
    setOmniModel,
    setOmniResolution,
    setVeoVideoMode,
    setOmniVideoMode,
    setVeoAmount,
    setOmniAmount,
    setOverlayOpen,
    setButtonOffset,
    setSectionExpanded,
    setScan,
  } = usePrefs();
  const { offset, onPointerDown, onPointerMove, onPointerUp } = useDraggable(prefs.buttonOffset, setButtonOffset);
  const { scan, scanning, refresh } = useModelScan(!!box, prefsLoaded, prefs.scan, setScan);

  // Which video model (Veo vs Omni Flash) is actually live in Flow right
  // now, and which Frames/Ingredients mode it's in — the collapsed
  // trigger alone can't tell Veo and Omni apart once a tier gives Veo a
  // length option too (both then show a duration marker), so this is
  // tracked separately: seeded from each scan's live snapshot
  // (self-healing if the user changed something in Flow's own panel) and
  // updated optimistically whenever a click here applies a video preset.
  const [videoActive, setVideoActive] = useState<VideoActive>({ mode: 'frames', modelLabel: null });

  useEffect(() => {
    if (scan && scan.active.tab === 'videocam' && scan.active.mode) {
      setVideoActive({ mode: scan.active.mode, modelLabel: scan.active.modelLabel });
    }
  }, [scan]);

  if (!box) return null;

  const { openBelow, alignLeft } = computePlacement(offset);
  const widgetClass = [openBelow && 'fqs-open-below', alignLeft && 'fqs-align-left'].filter(Boolean).join(' ');

  const nanoActive = isNanoActive(triggerSummary);
  const activeVideoCategory = triggerSummary?.isVideo ? categoryOf(videoActive.modelLabel) : null;
  const veoActive = activeVideoCategory === 'veo';
  const omniActive = activeVideoCategory === 'omni';

  // A model/amount/mode switch only has somewhere to apply to once its
  // category is already the active selection in Flow — otherwise it's
  // just saved and rides along with the next click that opens that
  // category's panel.
  function applyModelIfActive(active: boolean, tabIcon: 'image' | 'videocam', modelName: string, mode?: VideoMode) {
    if (!active || !triggerSummary?.count) return;
    applyPreset({ tabIcon, mode, modelName, subText: triggerSummary.count });
  }

  function handleNanoModel(label: string) {
    setNanoModel(label);
    applyModelIfActive(nanoActive, 'image', label);
  }

  function handleVeoModel(label: string) {
    setVeoModel(label);
    if (veoActive) {
      setVideoActive({ mode: prefs.veoVideoMode, modelLabel: label });
      applyModelIfActive(true, 'videocam', label, prefs.veoVideoMode);
    }
  }

  // Unlike Veo's model, Omni's quality/variant pick is just remembered —
  // it's never applied to Flow live even when Omni is the active tab. Omni
  // normally only has one variant, so this mainly matters for tiers that
  // expose more; there's no way to preview mid-generation which the
  // account will actually have, so it's saved for whenever it's next used
  // rather than poking Flow's UI right away.
  function handleOmniModel(label: string) {
    setOmniModel(label);
  }

  function handleVeoMode(mode: VideoMode) {
    setVeoVideoMode(mode);
    if (veoActive) {
      setVideoActive({ mode, modelLabel: videoActive.modelLabel });
      void applyVideoMode(mode);
    }
  }

  function handleOmniMode(mode: VideoMode) {
    setOmniVideoMode(mode);
    if (omniActive) {
      setVideoActive({ mode, modelLabel: videoActive.modelLabel });
      void applyVideoMode(mode);
    }
  }

  function handleVeoAmount(amount: Amount) {
    setVeoAmount(amount);
    if (veoActive) void applyAmount(amount);
  }

  function handleOmniAmount(amount: Amount) {
    setOmniAmount(amount);
    if (omniActive) void applyAmount(amount);
  }

  // Same rule as amount: save the pick, and only push it to Flow live if
  // Omni is actually the active tab right now — previously this applied
  // unconditionally, so clicking a resolution while e.g. Veo was showing
  // would instantly switch Flow's live tab/model out from under the user.
  function handleOmniResolution(modelLabel: string, resolution: string) {
    setOmniResolution(resolution);
    if (omniActive) {
      applyPreset({ tabIcon: 'videocam', mode: prefs.omniVideoMode, modelName: modelLabel, subText: resolution });
      setVideoActive({ mode: prefs.omniVideoMode, modelLabel });
    }
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
            scan={scan}
            scanning={scanning}
            onRefresh={refresh}
            sectionsExpanded={prefs.sectionsExpanded}
            onToggleSection={(id) => setSectionExpanded(id, !prefs.sectionsExpanded[id])}
            nanoActive={nanoActive}
            veoActive={veoActive}
            omniActive={omniActive}
            count={triggerSummary?.count ?? null}
            duration={triggerSummary?.duration ?? null}
            resolution={triggerSummary?.resolution ?? null}
            onSetNanoModel={handleNanoModel}
            onSetVeoModel={handleVeoModel}
            onSetOmniModel={handleOmniModel}
            onSetVeoMode={handleVeoMode}
            onSetOmniMode={handleOmniMode}
            onSetVeoAmount={handleVeoAmount}
            onSetOmniAmount={handleOmniAmount}
            onImg={(amount) => applyPreset({ tabIcon: 'image', modelName: prefs.nanoModel, subText: amount })}
            onVeoDuration={(duration) => {
              applyPreset({
                tabIcon: 'videocam',
                mode: prefs.veoVideoMode,
                modelName: prefs.veoModel,
                subText: duration,
                amount: prefs.veoAmount,
              });
              setVideoActive({ mode: prefs.veoVideoMode, modelLabel: prefs.veoModel });
            }}
            onVeoResolution={(resolution) => {
              applyPreset({ tabIcon: 'videocam', mode: prefs.veoVideoMode, modelName: prefs.veoModel, subText: resolution });
              setVideoActive({ mode: prefs.veoVideoMode, modelLabel: prefs.veoModel });
            }}
            onOmniDuration={(modelLabel, duration) => {
              applyPreset({
                tabIcon: 'videocam',
                mode: prefs.omniVideoMode,
                modelName: modelLabel,
                // Switching into Omni resets its resolution row to whatever
                // Flow last used for it — reassert the saved pick here too,
                // or it silently reverts even though it was never touched.
                resolution: prefs.omniResolution ?? undefined,
                subText: duration,
                amount: prefs.omniAmount,
              });
              setVideoActive({ mode: prefs.omniVideoMode, modelLabel });
            }}
            onOmniResolution={handleOmniResolution}
          />
        )}
      </div>
      {/* Flow's own settings panel opens directly above the prompt box —
          the same spot the paste button lives in — so hide it while that
          panel is open instead of letting the two overlap. */}
      {!panelOpen && pastePos && (
        <PasteButton top={pastePos.top} left={pastePos.left} onPaste={() => void pasteFromClipboard()} />
      )}
      {!panelOpen && clearRefsPos && (
        <ClearRefsButton top={clearRefsPos.top} left={clearRefsPos.left} onClear={() => void clearReferences()} />
      )}
    </>
  );
}
