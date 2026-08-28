import { clearReferences, pasteFromClipboard } from '../flow-dom';
import { useDraggable } from '../hooks/useDraggable';
import { useFlowPresets } from '../hooks/useFlowPresets';
import { useFlowSync } from '../hooks/useFlowSync';
import { useModelScan } from '../hooks/useModelScan';
import { usePrefs } from '../hooks/usePrefs';
import { ClearRefsButton } from './ClearRefsButton';
import { Overlay } from './Overlay';
import { PasteButton } from './PasteButton';
import { RefreshButton } from './RefreshButton';
import { ToggleButton } from './ToggleButton';

// Matches #fqs-widget's fixed bottom/right in style.css, to derive the
// button's screen position from the drag offset alone.
const WIDGET_ANCHOR = 16;

// Flips the overlay to open downward once dragged into the top half of the
// screen. Horizontally, the screen splits into three regions around the
// prompt box's edges, each bisected so the overlay always opens toward
// open space rather than off-screen or under the box.
function computePlacement(offset: { x: number; y: number }, boxRect: { left: number; right: number }) {
  const buttonRight = window.innerWidth - WIDGET_ANCHOR + offset.x;
  const buttonBottom = window.innerHeight - WIDGET_ANCHOR + offset.y;

  const [regionStart, regionEnd] =
    buttonRight < boxRect.left
      ? [0, boxRect.left]
      : buttonRight > boxRect.right
        ? [boxRect.right, window.innerWidth]
        : [boxRect.left, boxRect.right];
  const regionMid = (regionStart + regionEnd) / 2;

  return {
    openBelow: buttonBottom < window.innerHeight / 2,
    alignLeft: buttonRight < regionMid,
  };
}

export function App() {
  const { box, panelOpen, triggerSummary, pastePos, clearRefsPos, isEditPage } = useFlowSync();
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
  const presets = useFlowPresets({
    prefs,
    triggerSummary,
    scan,
    setNanoModel,
    setVeoModel,
    setOmniModel,
    setOmniResolution,
    setVeoVideoMode,
    setOmniVideoMode,
    setVeoAmount,
    setOmniAmount,
  });

  if (!box) return null;

  const { openBelow, alignLeft } = computePlacement(offset, box.getBoundingClientRect());
  const widgetClass = [openBelow && 'fqs-open-below', alignLeft && 'fqs-align-left', isEditPage && 'fqs-hidden']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* Faded rather than unmounted on an edit page, so the opacity
          transition has something to animate between. */}
      <div id="fqs-widget" class={widgetClass} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <ToggleButton
          open={prefs.overlayOpen}
          onToggle={() => setOverlayOpen(!prefs.overlayOpen)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <RefreshButton visible={prefs.overlayOpen} scanning={scanning} onRefresh={refresh} />
        <Overlay
          prefs={prefs}
          scan={scan}
          visible={prefs.overlayOpen}
          sectionsExpanded={prefs.sectionsExpanded}
          onToggleSection={(id) => setSectionExpanded(id, !prefs.sectionsExpanded[id])}
          count={triggerSummary?.count ?? null}
          duration={triggerSummary?.duration ?? null}
          resolution={triggerSummary?.resolution ?? null}
          {...presets}
        />
      </div>
      {/* Faded while Flow's own panel is open — it opens in the same spot. */}
      {pastePos && (
        <PasteButton top={pastePos.top} left={pastePos.left} visible={!panelOpen} onPaste={() => void pasteFromClipboard()} />
      )}
      {clearRefsPos && (
        <ClearRefsButton top={clearRefsPos.top} left={clearRefsPos.left} visible={!panelOpen} onClear={() => void clearReferences()} />
      )}
    </>
  );
}
