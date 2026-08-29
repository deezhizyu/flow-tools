import { clearReferences, pasteFromClipboard } from '../flow-dom';
import { useDraggable } from '../hooks/useDraggable';
import { useFlowPresets } from '../hooks/useFlowPresets';
import { useFlowSync } from '../hooks/useFlowSync';
import { useInstantReveal } from '../hooks/useInstantReveal';
import { useModelScan } from '../hooks/useModelScan';
import { usePrefs } from '../hooks/usePrefs';
import { useTileHover } from '../hooks/useTileHover';
import { ClearRefsButton } from './ClearRefsButton';
import { Overlay } from './Overlay';
import { PasteButton } from './PasteButton';
import { RefreshButton } from './RefreshButton';
import { TileQuickActions } from './TileQuickActions';
import { ToggleButton } from './ToggleButton';

// Matches #ft-widget's fixed bottom/right in style.css, to derive the
// button's screen position from the drag offset alone.
const WIDGET_ANCHOR = 16;

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
  useInstantReveal();
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
  const hoveredTile = useTileHover();
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
  const widgetClass = [openBelow && 'ft-open-below', alignLeft && 'ft-align-left', isEditPage && 'ft-hidden']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* Faded rather than unmounted on an edit page, so the opacity
          transition has something to animate between. */}
      <div id="ft-widget" class={widgetClass} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
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
      {pastePos && (
        <PasteButton top={pastePos.top} left={pastePos.left} visible={!panelOpen} onPaste={() => void pasteFromClipboard()} />
      )}
      {clearRefsPos && (
        <ClearRefsButton top={clearRefsPos.top} left={clearRefsPos.left} visible={!panelOpen} onClear={() => void clearReferences()} />
      )}
      {hoveredTile && <TileQuickActions state={hoveredTile} />}
    </>
  );
}
