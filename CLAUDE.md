# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Flow Tools is a Chrome (Manifest V3) extension for Google Flow (`labs.google/fx/*/tools/flow/*`, `flow.google/*`). It injects a floating widget into the page that adds collapsible quick-select buttons for Nano Banana, Veo 3.1, and Omni Flash models/settings, plus one-click paste-prompt and clear-references buttons — all by driving Flow's own UI rather than calling any API.

## Commands

```bash
pnpm dev       # vite dev build, watches for changes
pnpm build     # tsc -b type-check, then vite build (outputs to dist/)
pnpm preview   # preview a production build
```

No test suite or linter is configured. Load the unpacked `dist/` folder in `chrome://extensions` (Developer Mode) to try changes; `pnpm dev` rebuilds on save but the extension still needs a manual reload in Chrome.

## Architecture

Two isolated contexts talk over `chrome.runtime` messages — there is no shared memory between them:

- **`src/background/index.ts`** — the service worker. Sole owner of `chrome.storage.local`. Validates every incoming pref against `isValidValue` before persisting (falls back to `DEFAULT_PREFS` on anything malformed) and answers `GET_PREFS`/`SET_PREF` messages.
- **`src/content/`** — injected into the Flow page (`index.tsx` mounts a Preact `<App>` into a root div appended to `document.body`). Never touches storage directly — always round-trips through `sendMessage` (`src/lib/messaging.ts`).

### `src/content/flow-dom/`

The extension has no access to Flow's internal state or API, so this layer drives Flow's real DOM: opening its settings panel, clicking its trigger buttons, and reading back what's rendered. Its public surface is re-exported from `index.ts`; internal helpers (`dom-utils.ts`, `busy.ts`) stay private.

- **`panel.ts`** — low-level panel/trigger primitives (finding the panel, listing `.flow_tab_slider_trigger` rows, clicking by icon/text, `withPanel` to open-work-close atomically while hiding the flicker via a CSS class).
- **`scan.ts`** — `scanFlow()` opens Flow's panel and walks every tab/mode/model combination to discover the live set of models, durations, and resolutions (never hardcoded, since the account's tier determines what's offered), then restores whatever selection was active before the scan.
- **`presets.ts`** — applies a saved preset (model/mode/duration/resolution/amount) back onto the live panel.
- **`model-match.ts`** — fuzzy word-set matching so version-number drift in model labels (e.g. "Omni 1.1 Flash" → "1.2") doesn't break grouping.
- **`layout.ts`, `trigger-summary.ts`, `prompt-actions.ts`** — prompt-box sizing, reading the collapsed trigger's summary text, and paste/clear-references actions.

### `src/content/hooks/`

Each hook owns one concern and `App.tsx` wires them together:

- **`useFlowSync`** — polls Flow's live DOM (via `MutationObserver`/`ResizeObserver`, coalesced to one tick per animation frame) for the prompt box, panel-open state, and button anchor positions.
- **`usePrefs`** — mirrors the background worker's persisted `Prefs`; writes are optimistic then reconciled with the worker's response.
- **`useModelScan`** — triggers/caches `scanFlow()` results.
- **`useFlowPresets`** — the widget's central logic: translates a UI interaction (e.g. "user clicked Veo Fast") into "apply live to Flow if that category is currently active, otherwise just save the preference for next time." Also tracks which video model/mode is actually live, since Flow's collapsed trigger alone can't distinguish Veo from Omni once both show a duration.
- **`useDraggable`** — widget drag-to-reposition, persisted via `buttonOffset`.

### Data flow

`Prefs` (`src/lib/messaging.ts`) is the single source of truth for saved settings, synced between content script and background worker. `ScanResult` (`src/lib/models.ts`) is the separately-cached shape of what scanning Flow's panel discovered. Model label sets are never hardcoded as closed unions — Flow's own menu is the source of truth, discovered live and matched loosely by word set.

## Code style

- No duplication — extract shared logic into `lib/`, `flow-dom/`, or a hook rather than repeating it.
- Prefer simple, readable code over clever code.
- Comments are for non-obvious *why* only (a workaround, an invariant, a hidden constraint) — never for *what* the code does. Self-explanatory code needs no comment.
