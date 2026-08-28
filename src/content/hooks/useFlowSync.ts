import { useEffect, useRef, useState } from 'preact/hooks';
import {
  applyPromptMaxHeight,
  findMainTrigger,
  getFlowRouteMode,
  getPanel,
  getPromptBox,
  getPromptScrollContainer,
  getPromptWidget,
  readTriggerSummary,
  type TriggerSummary,
} from '../flow-dom';

const PASTE_BTN_SIZE = 30;
const PASTE_BTN_GAP = 6;

interface PastePos {
  top: number;
  left: number;
}

interface FlowSyncState {
  box: HTMLElement | null;
  widget: HTMLElement | null;
  panelOpen: boolean;
  triggerSummary: TriggerSummary | null;
  pastePos: PastePos | null;
  clearRefsPos: PastePos | null;
  isEditPage: boolean;
}

const EMPTY_STATE: FlowSyncState = {
  box: null,
  widget: null,
  panelOpen: false,
  triggerSummary: null,
  pastePos: null,
  clearRefsPos: null,
  isEditPage: false,
};

function posEqual(a: PastePos | null, b: PastePos | null): boolean {
  if (a === b) return true;
  return !!a && !!b && a.top === b.top && a.left === b.left;
}

function summaryEqual(a: TriggerSummary | null, b: TriggerSummary | null): boolean {
  if (a === b) return true;
  return (
    !!a &&
    !!b &&
    a.count === b.count &&
    a.duration === b.duration &&
    a.resolution === b.resolution &&
    a.isNano === b.isNano &&
    a.isVideo === b.isVideo
  );
}

// Preact skips the re-render when a setState updater returns the previous
// reference — this tick fires on every DOM mutation/resize/scroll, most of
// which change nothing the widget cares about.
function statesEqual(a: FlowSyncState, b: FlowSyncState): boolean {
  return (
    a.box === b.box &&
    a.widget === b.widget &&
    a.panelOpen === b.panelOpen &&
    a.isEditPage === b.isEditPage &&
    summaryEqual(a.triggerSummary, b.triggerSummary) &&
    posEqual(a.pastePos, b.pastePos) &&
    posEqual(a.clearRefsPos, b.clearRefsPos)
  );
}

// Vertical anchor comes from the whole widget (accounts for Frames mode's
// extra row); horizontal centers the clear-references + paste pair on the
// text box itself.
function computePastePos(box: HTMLElement, widget: HTMLElement | null): { pastePos: PastePos; clearRefsPos: PastePos } {
  const topRect = (widget || box).getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  const top = topRect.top - PASTE_BTN_SIZE + 6;
  const groupWidth = PASTE_BTN_SIZE * 2 + PASTE_BTN_GAP;
  const groupLeft = boxRect.left + boxRect.width / 2 - groupWidth / 2;
  return {
    clearRefsPos: { top, left: groupLeft },
    pastePos: { top, left: groupLeft + PASTE_BTN_SIZE + PASTE_BTN_GAP },
  };
}

function readState(): FlowSyncState {
  const box = getPromptBox();
  if (!box) return EMPTY_STATE;

  const trigger = findMainTrigger();
  const widget = getPromptWidget(box, trigger);
  const { pastePos, clearRefsPos } = computePastePos(box, widget);
  return {
    box,
    widget,
    panelOpen: !!getPanel(),
    triggerSummary: readTriggerSummary(trigger),
    pastePos,
    clearRefsPos,
    isEditPage: getFlowRouteMode() === 'edit',
  };
}

export function useFlowSync(): FlowSyncState {
  const [state, setState] = useState<FlowSyncState>(EMPTY_STATE);
  const observedWidget = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let tickScheduled = false;

    function tick() {
      const next = readState();

      // Flow remounts the widget's DOM on mode switches, so the observed
      // node needs re-picking whenever the widget element itself changes.
      if (next.widget !== observedWidget.current) {
        resizeObserverRef.current?.disconnect();
        observedWidget.current = next.widget;
        if (next.widget) resizeObserverRef.current?.observe(next.widget);
      }
      applyPromptMaxHeight(next.box ? getPromptScrollContainer(next.box) : null);

      setState((prev) => (statesEqual(prev, next) ? prev : next));
    }

    // Mutations/resizes arrive in bursts — coalesce into one tick per frame.
    function scheduleTick() {
      if (tickScheduled) return;
      tickScheduled = true;
      requestAnimationFrame(() => {
        tickScheduled = false;
        tick();
      });
    }

    resizeObserverRef.current = new ResizeObserver(scheduleTick);

    const mutationObserver = new MutationObserver(scheduleTick);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'aria-expanded'],
    });
    window.addEventListener('resize', scheduleTick);
    window.addEventListener('scroll', scheduleTick, true);

    tick();

    return () => {
      mutationObserver.disconnect();
      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', scheduleTick);
      window.removeEventListener('scroll', scheduleTick, true);
    };
  }, []);

  return state;
}
