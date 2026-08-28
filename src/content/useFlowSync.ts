import { useEffect, useRef, useState } from 'preact/hooks';
import {
  applyPromptMaxHeight,
  getPanel,
  getPromptBox,
  getPromptScrollContainer,
  getPromptWidget,
  readTriggerSummary,
  type TriggerSummary,
} from './flow-dom';

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

// Vertical anchor comes from the whole widget (so Frames mode's extra top
// row is accounted for); horizontal centers the whole two-button group
// (clear-references then paste, left to right) on the text box itself,
// rather than centering the paste button alone and letting the pair hang
// off to one side.
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

// Tracks Flow's prompt box/widget/settings panel, re-syncing on every
// relevant DOM mutation, resize, or scroll.
export function useFlowSync(): FlowSyncState {
  const [state, setState] = useState<FlowSyncState>(EMPTY_STATE);
  const observedWidget = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let tickScheduled = false;

    function tick() {
      const box = getPromptBox();
      const widget = box ? getPromptWidget(box) : null;

      // Flow re-renders the widget's DOM as it switches modes (e.g.
      // toggling Frames), so the ResizeObserver target must be re-picked
      // whenever the widget element itself changes — observing a node
      // that got replaced silently stops firing.
      if (widget !== observedWidget.current) {
        resizeObserverRef.current?.disconnect();
        observedWidget.current = widget;
        if (widget) resizeObserverRef.current?.observe(widget);
      }
      applyPromptMaxHeight(box ? getPromptScrollContainer(box) : null);

      if (!box) {
        setState(EMPTY_STATE);
        return;
      }

      const { pastePos, clearRefsPos } = computePastePos(box, widget);
      setState({
        box,
        widget,
        panelOpen: !!getPanel(),
        triggerSummary: readTriggerSummary(),
        pastePos,
        clearRefsPos,
        // An open image/video's own edit view — the quick-settings overlay
        // has nothing to apply to there, but paste/clear-references still
        // act on the same prompt box, so those stay.
        isEditPage: location.pathname.includes('/edit/'),
      });
    }

    // Mutations/resizes tend to arrive in bursts (one Flow state change
    // can touch several nodes), so coalesce them into a single tick per
    // frame instead of running the full sync once per individual event.
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
