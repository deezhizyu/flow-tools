// Flow Quick Select — content script
// Drives Google Flow's own settings panel + prompt box programmatically.
(() => {
  const NANO_BASE = 'Nano Banana';
  const NANO_MODELS = {
    pro: 'Nano Banana Pro',
    '2': 'Nano Banana 2',
    '2lite': 'Nano Banana 2 Lite',
  };
  const VEO_MODELS = {
    quality: 'Veo 3.1 Quality',
    flash: 'Veo 3.1 Fast',
    lite: 'Veo 3.1 Lite',
  };
  // Omni Flash has no sibling variants, so its version number ("Omni 1.1
  // Flash") is just noise to ignore, not a discriminator — it's matched
  // loosely (see matchesModel) unlike the Nano Banana / Veo 3.1 variants.
  const OMNI_MODEL = 'Omni Flash';
  const NANO_VARIANTS = Object.keys(NANO_MODELS);
  const VEO_VARIANTS = Object.keys(VEO_MODELS);
  const AMOUNTS = ['x1', 'x2', 'x3', 'x4'];

  const NANO_MODEL_KEY = 'fqsNanoModel';
  const VEO_MODEL_KEY = 'fqsVeoModel';
  const OMNI_AMOUNT_KEY = 'fqsOmniAmount';

  // The model-variant buttons (Pro/2/2 Lite, Quality/Flash/Lite) and the
  // Omni Flash amount row are local preferences only — they never touch
  // Flow's own UI by themselves. Each is read back in whenever its
  // section's apply-trigger row is pressed (the output-count row for Nano
  // Banana/Veo 3.1, the duration row for Omni Flash), so the saved
  // preference always rides along with that action.
  let nanoModel = 'pro';
  let veoModel = 'flash';
  let omniAmount = 'x1';
  chrome.storage.local.get(
    { [NANO_MODEL_KEY]: 'pro', [VEO_MODEL_KEY]: 'flash', [OMNI_AMOUNT_KEY]: 'x1' },
    (res) => {
      nanoModel = NANO_VARIANTS.includes(res[NANO_MODEL_KEY]) ? res[NANO_MODEL_KEY] : 'pro';
      veoModel = VEO_VARIANTS.includes(res[VEO_MODEL_KEY]) ? res[VEO_MODEL_KEY] : 'flash';
      omniAmount = AMOUNTS.includes(res[OMNI_AMOUNT_KEY]) ? res[OMNI_AMOUNT_KEY] : 'x1';
      renderPersistedSelections();
    }
  );

  function setNanoModel(value) {
    if (!NANO_VARIANTS.includes(value) || value === nanoModel) return;
    nanoModel = value;
    chrome.storage.local.set({ [NANO_MODEL_KEY]: value });
    renderPersistedSelections();
  }

  function setVeoModel(value) {
    if (!VEO_VARIANTS.includes(value) || value === veoModel) return;
    veoModel = value;
    chrome.storage.local.set({ [VEO_MODEL_KEY]: value });
    renderPersistedSelections();
  }

  function setOmniAmount(value) {
    if (!AMOUNTS.includes(value) || value === omniAmount) return;
    omniAmount = value;
    chrome.storage.local.set({ [OMNI_AMOUNT_KEY]: value });
    renderPersistedSelections();
  }

  function renderPersistedSelections() {
    const overlay = document.getElementById('fqs-overlay');
    if (!overlay) return;
    overlay.querySelectorAll('[data-fqs-nano-model]').forEach((b) => {
      b.classList.toggle('fqs-active', b.dataset.fqsNanoModel === nanoModel);
    });
    overlay.querySelectorAll('[data-fqs-veo-model]').forEach((b) => {
      b.classList.toggle('fqs-active', b.dataset.fqsVeoModel === veoModel);
    });
    overlay.querySelectorAll('[data-fqs-omni-amt]').forEach((b) => {
      b.classList.toggle('fqs-active', b.dataset.fqsOmniAmt === omniAmount);
    });
  }

  // ---- collapsible sections ----

  const SECTIONS = ['nano', 'veo', 'omni'];
  const sectionExpanded = { nano: true, veo: true, omni: true };

  function toggleSection(name) {
    if (!(name in sectionExpanded)) return;
    sectionExpanded[name] = !sectionExpanded[name];
    renderSectionState();
  }

  function renderSectionState() {
    const overlay = document.getElementById('fqs-overlay');
    if (!overlay) return;
    SECTIONS.forEach((name) => {
      const expanded = sectionExpanded[name];
      const toggle = overlay.querySelector(`[data-fqs-toggle="${name}"]`);
      const body = overlay.querySelector(`[data-fqs-body="${name}"]`);
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(expanded));
        // Swap to the actual paired Material Symbols icon per state rather
        // than rotating one — arrow_drop_down/arrow_drop_up render exactly
        // as their names say, no CSS transform involved.
        const chevron = toggle.querySelector('.fqs-chevron');
        if (chevron) chevron.textContent = expanded ? 'arrow_drop_up' : 'arrow_drop_down';
      }
      if (body) body.hidden = !expanded;
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function nextPaint() {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  async function waitFor(fn, { timeout = 2500, interval = 40 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const val = fn();
      if (val) return val;
      await sleep(interval);
    }
    return null;
  }

  function isVisible(el) {
    return !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  // Flow's settings panel is built on Radix UI, which opens/toggles on
  // pointerdown rather than a plain "click" event. A script-dispatched
  // element.click() does not trigger it, so we simulate a full trusted-like
  // pointer/mouse sequence instead.
  function fullClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
    };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function getPromptBox() {
    const boxes = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    return boxes.find(isVisible) || null;
  }

  function getPromptContainer(box) {
    return box.closest('div[class]').parentElement.parentElement;
  }

  // In "Frames" mode Flow inserts a Start/End row above the prompt box,
  // pushing the box itself further down — anchoring the paste button to
  // box.getBoundingClientRect().top alone then lands it mid-way through
  // that row instead of above the whole widget. Climb from the box to the
  // nearest ancestor that also contains the bottom-toolbar settings
  // trigger (found via the locale-independent icon-ligature match in
  // findMainTrigger) — that ancestor spans the entire prompt widget, top
  // row included, in both modes.
  function getPromptWidget(box) {
    const trigger = findMainTrigger();
    if (!trigger) return getPromptContainer(box);
    let el = box;
    while (el && !el.contains(trigger)) {
      el = el.parentElement;
    }
    return el || getPromptContainer(box);
  }

  // The prompt bar's "clear" (X) button only exists while the box has
  // content; its icon ligature is literally "close".
  function findClearButton(container) {
    return (
      Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('i')?.textContent.trim() === 'close'
      ) || null
    );
  }

  // The main settings trigger button (bottom toolbar) is the only
  // aria-haspopup="menu" button, outside the settings panel itself,
  // whose icon ligature starts with "crop_" (aspect-ratio icon).
  function findMainTrigger() {
    const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
    return (
      buttons.find((b) => {
        if (b.closest('.DropdownMenuContent')) return false;
        const icon = b.querySelector('i');
        return icon && icon.textContent.trim().startsWith('crop_');
      }) || null
    );
  }

  function getPanel() {
    const panels = Array.from(document.querySelectorAll('.DropdownMenuContent'));
    return panels.find(isVisible) || null;
  }

  function getTabTriggers(panel) {
    return Array.from(panel.querySelectorAll('.flow_tab_slider_trigger'));
  }

  function clickTabByIcon(panel, iconName) {
    const btn = getTabTriggers(panel).find((b) => {
      const icon = b.querySelector('i');
      return icon && icon.textContent.trim() === iconName;
    });
    if (btn && btn.getAttribute('data-state') !== 'active') fullClick(btn);
    return btn;
  }

  function getModelMenuButton(panel) {
    return panel.querySelector('button[aria-haspopup="menu"]');
  }

  // These buttons/items render label text immediately butted against an
  // <i> icon ligature with no separator, e.g. "...Pro" directly followed by
  // "arrow_drop_down" — .textContent would fuse them into one "proarrow"
  // token and the real word ("pro") would never match anything. Walk every
  // text node in the subtree (label text can be nested in a child <span>,
  // not always a direct child) but skip any node sitting under an <i>, so
  // icon ligature names never leak into the matched text.
  function modelLabelText(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && node.parentElement.closest('i')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    });
    const parts = [];
    let n;
    while ((n = walker.nextNode())) parts.push(n.textContent);
    return parts.join(' ');
  }

  // Flow reorders/relabels this button's words around punctuation (seen
  // live: "Omni Flash 1.1" became "Omni 1.1 Flash" after an update; Veo
  // variants render as "Veo 3.1 - Fast"), so match on word sets rather than
  // a substring/prefix — order/punctuation-independent. Digits are kept as
  // their own tokens (not stripped): "Nano Banana 2" vs "Nano Banana 2
  // Lite" vs "Nano Banana Pro" differ only by a digit and/or a trailing
  // word, so picking one of those requires an exact set match (see
  // matchesModel) — a subset check would let "Nano Banana 2" match against
  // an already-selected "Nano Banana 2 Lite" and wrongly skip the switch.
  function modelWords(text) {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
    );
  }

  // Loose subset check: every word of targetName appears in text, extra
  // words in text are ignored. Used for "is this trigger summary some Nano
  // Banana variant at all" detection (variant suffix shouldn't matter),
  // and for matching Omni Flash (its version-number suffix shouldn't
  // matter, and it has no sibling variant to be confused with).
  function textContainsModelWords(text, targetName) {
    const actual = modelWords(text);
    const target = modelWords(targetName);
    for (const word of target) {
      if (!actual.has(word)) return false;
    }
    return true;
  }

  // Exact set match, used to pick/confirm one specific Nano Banana or Veo
  // 3.1 variant, where a subset check would be ambiguous (see modelWords).
  function textMatchesModel(text, targetName) {
    const actual = modelWords(text);
    const target = modelWords(targetName);
    if (actual.size !== target.size) return false;
    for (const word of target) {
      if (!actual.has(word)) return false;
    }
    return true;
  }

  function matchesModel(el, targetName, exact) {
    const text = modelLabelText(el);
    return exact ? textMatchesModel(text, targetName) : textContainsModelWords(text, targetName);
  }

  // Duration buttons only exist under Omni Flash — Veo 3.1 hides them
  // entirely — so the model must be corrected before picking a duration.
  async function selectModelIfNeeded(panel, modelName, exact) {
    const modelBtn = getModelMenuButton(panel);
    if (!modelBtn) return;
    if (matchesModel(modelBtn, modelName, exact)) return;

    fullClick(modelBtn);
    const items = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('[role="menuitem"]')).filter(isVisible);
      return found.length ? found : null;
    });
    if (!items) return;
    const item = items.find((i) => matchesModel(i, modelName, exact));
    if (!item) return;
    fullClick(item);
    await waitFor(() => {
      const p = getPanel();
      const b = p && getModelMenuButton(p);
      return b && matchesModel(b, modelName, exact);
    });
  }

  // Guards against a click landing mid-flight of a previous applyPreset/
  // pasteFromClipboard call, which otherwise races the same panel/box.
  let busy = false;

  // subText is the row button to press after the model is set — the
  // output-count button (x1-x4) for Nano Banana/Veo 3.1, or the duration
  // button (4s-10s) for Omni Flash. amount, when given, is a second
  // output-count click after subText (only Omni Flash needs this, since
  // its duration and count are two separate rows). modelMatch controls how
  // strictly the current/target model label is compared — 'exact' for
  // Nano Banana/Veo 3.1 (sibling variants that must not be confused with
  // each other), 'loose' for Omni Flash (no siblings, ignore its version
  // number).
  async function applyPreset({ tabIcon, modelName, subText, amount, modelMatch = 'exact' }) {
    if (busy) return;
    busy = true;
    try {
      let trigger = findMainTrigger();
      if (!trigger) return;

      let panel = getPanel();
      if (!panel) {
        fullClick(trigger);
        panel = await waitFor(getPanel);
        if (!panel) return;
      }

      clickTabByIcon(panel, tabIcon);
      panel = (await waitFor(getPanel)) || panel;

      await selectModelIfNeeded(panel, modelName, modelMatch === 'exact');
      panel = (await waitFor(getPanel)) || panel;

      // The duration/count row can re-render a beat after the model switch
      // (e.g. switching models mounts the row from scratch), so poll for
      // the actual target button rather than assuming it's already there
      // — clicking too early is a silent no-op.
      const targetBtn = await waitFor(() => {
        const p = getPanel() || panel;
        return getTabTriggers(p).find((b) => b.textContent.trim() === subText) || null;
      });
      if (targetBtn) fullClick(targetBtn);

      if (amount) {
        await sleep(80);
        panel = getPanel() || panel;
        const amountBtn = getTabTriggers(panel).find((b) => b.textContent.trim() === amount);
        if (amountBtn) fullClick(amountBtn);
      }

      await sleep(80);

      trigger = findMainTrigger() || trigger;
      const stillOpen = getPanel();
      if (trigger && stillOpen) fullClick(trigger);
    } finally {
      busy = false;
    }
  }

  // This prompt box is a controlled rich-text editor (its own internal
  // state, not just the DOM) that ignores document.execCommand and
  // synthetic "paste" events, and only accepts a "beforeinput" event with
  // inputType "insertText" — but even that always inserts at the editor's
  // own tracked cursor rather than respecting a script-set Selection/Range.
  // So existing content must be cleared via Flow's own "X" button first,
  // then the new text is inserted into the now-empty, cursor-at-start box.
  async function pasteFromClipboard() {
    if (busy) return;
    busy = true;
    try {
      const box = getPromptBox();
      if (!box) return;
      let text;
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        return;
      }
      if (!text) return;

      const container = getPromptContainer(box);
      const clearBtn = findClearButton(container);
      if (clearBtn) {
        fullClick(clearBtn);
        await waitFor(() => !findClearButton(container));
      }

      box.focus();
      // On the box's very first-ever focus after a fresh page load, Flow's
      // editor hasn't finished initializing its internal editing state yet
      // — a beforeinput dispatched synchronously right after focus() is
      // silently dropped. Waiting two animation frames lets that
      // initialization render before we dispatch. (Subsequent focuses are
      // already initialized, so this is a no-op wait in practice.)
      await nextPaint();
      const evt = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: text,
      });
      box.dispatchEvent(evt);
    } finally {
      busy = false;
    }
  }

  // ---- UI injection ----

  function sectionMarkup(name, label, bodyHtml) {
    return `
      <div class="fqs-group">
        <button type="button" class="fqs-section-toggle" data-fqs-toggle="${name}" aria-expanded="true">
          <span>${label}</span>
          <span class="fqs-chevron google-symbols" aria-hidden="true">arrow_drop_up</span>
        </button>
        <div class="fqs-section-body" data-fqs-body="${name}">
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  function ensureOverlay() {
    let el = document.getElementById('fqs-overlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fqs-overlay';
    el.innerHTML =
      sectionMarkup(
        'nano',
        'Nano Banana',
        `
        <div class="fqs-row">
          <button type="button" data-fqs-nano-model="pro">Pro</button>
          <button type="button" data-fqs-nano-model="2">2</button>
          <button type="button" data-fqs-nano-model="2lite">2 Lite</button>
        </div>
        <div class="fqs-row">
          <button type="button" data-fqs-img="x1">x1</button>
          <button type="button" data-fqs-img="x2">x2</button>
          <button type="button" data-fqs-img="x3">x3</button>
          <button type="button" data-fqs-img="x4">x4</button>
        </div>
      `
      ) +
      sectionMarkup(
        'veo',
        'Veo 3.1',
        `
        <div class="fqs-row">
          <button type="button" data-fqs-veo-model="quality">Quality</button>
          <button type="button" data-fqs-veo-model="flash">Flash</button>
          <button type="button" data-fqs-veo-model="lite">Lite</button>
        </div>
        <div class="fqs-row">
          <button type="button" data-fqs-vid="x1">x1</button>
          <button type="button" data-fqs-vid="x2">x2</button>
          <button type="button" data-fqs-vid="x3">x3</button>
          <button type="button" data-fqs-vid="x4">x4</button>
        </div>
      `
      ) +
      sectionMarkup(
        'omni',
        'Omni Flash',
        `
        <div class="fqs-row">
          <button type="button" data-fqs-omni-dur="4s">4s</button>
          <button type="button" data-fqs-omni-dur="6s">6s</button>
          <button type="button" data-fqs-omni-dur="8s">8s</button>
          <button type="button" data-fqs-omni-dur="10s">10s</button>
        </div>
        <div class="fqs-row">
          <button type="button" data-fqs-omni-amt="x1">x1</button>
          <button type="button" data-fqs-omni-amt="x2">x2</button>
          <button type="button" data-fqs-omni-amt="x3">x3</button>
          <button type="button" data-fqs-omni-amt="x4">x4</button>
        </div>
      `
      );
    el.addEventListener('click', (ev) => {
      const toggleBtn = ev.target.closest('[data-fqs-toggle]');
      if (toggleBtn) {
        toggleSection(toggleBtn.dataset.fqsToggle);
        return;
      }

      const imgBtn = ev.target.closest('[data-fqs-img]');
      const vidBtn = ev.target.closest('[data-fqs-vid]');
      const nanoModelBtn = ev.target.closest('[data-fqs-nano-model]');
      const veoModelBtn = ev.target.closest('[data-fqs-veo-model]');
      const omniDurBtn = ev.target.closest('[data-fqs-omni-dur]');
      const omniAmtBtn = ev.target.closest('[data-fqs-omni-amt]');
      const target = imgBtn || vidBtn || nanoModelBtn || veoModelBtn || omniDurBtn || omniAmtBtn;
      if (!target) return;
      flashPressed(target);
      if (imgBtn) {
        applyPreset({
          tabIcon: 'image',
          modelName: NANO_MODELS[nanoModel],
          subText: imgBtn.dataset.fqsImg,
          modelMatch: 'exact',
        });
      } else if (vidBtn) {
        applyPreset({
          tabIcon: 'videocam',
          modelName: VEO_MODELS[veoModel],
          subText: vidBtn.dataset.fqsVid,
          modelMatch: 'exact',
        });
      } else if (omniDurBtn) {
        applyPreset({
          tabIcon: 'videocam',
          modelName: OMNI_MODEL,
          subText: omniDurBtn.dataset.fqsOmniDur,
          amount: omniAmount,
          modelMatch: 'loose',
        });
      } else if (nanoModelBtn) {
        // Model variant is a plain local preference: save it and repaint,
        // no Flow interaction — it only gets applied the next time an
        // output-count button is pressed.
        setNanoModel(nanoModelBtn.dataset.fqsNanoModel);
      } else if (veoModelBtn) {
        setVeoModel(veoModelBtn.dataset.fqsVeoModel);
      } else {
        // Omni Flash's amount is a plain local preference too: save it and
        // repaint, no Flow interaction — it only gets applied the next
        // time a duration button is pressed.
        setOmniAmount(omniAmtBtn.dataset.fqsOmniAmt);
      }
    });
    document.body.appendChild(el);
    renderPersistedSelections();
    renderSectionState();
    return el;
  }

  function ensurePasteButton() {
    let btn = document.getElementById('fqs-paste-btn');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'fqs-paste-btn';
    btn.type = 'button';
    btn.textContent = '📋';
    btn.title = 'Paste prompt from clipboard';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      flashPressed(btn);
      pasteFromClipboard();
    });
    document.body.appendChild(btn);
    return btn;
  }

  function flashPressed(el) {
    el.classList.add('fqs-pressed');
    setTimeout(() => el.classList.remove('fqs-pressed'), 300);
  }

  // The collapsed settings trigger (findMainTrigger) always renders a live
  // one-line summary of the current tab's settings, even while its panel is
  // closed — e.g. "🍌 Nano Banana Pro" + icon + "x1", or
  // "Video · 720p · 6s" + icon + "x1". Reading it lets the overlay mirror
  // Flow's real selection without opening anything.
  //
  // A resolution marker ("720p"/"360p") only ever appears there on the
  // video tab — the image tab's summary never contains one — so its mere
  // presence is a locale-independent signal that the video tab is active,
  // without needing to match localized mode labels like "Video"/"Відео".
  // Within the video tab, the duration segment ("6s") only ever appears
  // under Omni Flash — Veo 3.1's summary omits it entirely — so its
  // presence further distinguishes the two.
  function readTriggerSummary() {
    const trigger = findMainTrigger();
    if (!trigger) return null;
    const textParts = Array.from(trigger.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .filter(Boolean);
    const count = textParts.find((t) => /^x\d+$/i.test(t)) || null;
    const summary = textParts.find((t) => t !== count) || '';
    const durationMatch = summary.match(/\b(\d+)s\b/);
    return {
      count,
      duration: durationMatch ? `${durationMatch[1]}s` : null,
      isNano: textContainsModelWords(summary, NANO_BASE),
      isVideo: /\b\d+p\b/i.test(summary),
    };
  }

  function syncActiveState(overlay) {
    const state = readTriggerSummary();
    const nanoActive = !!state && state.isNano;
    const omniActive = !!state && state.isVideo && !!state.duration;
    const veoActive = !!state && state.isVideo && !state.duration;

    overlay.querySelectorAll('[data-fqs-img]').forEach((b) => {
      b.classList.toggle('fqs-active', nanoActive && state.count === b.dataset.fqsImg);
    });
    overlay.querySelectorAll('[data-fqs-vid]').forEach((b) => {
      b.classList.toggle('fqs-active', veoActive && state.count === b.dataset.fqsVid);
    });
    overlay.querySelectorAll('[data-fqs-omni-dur]').forEach((b) => {
      b.classList.toggle('fqs-active', omniActive && state.duration === b.dataset.fqsOmniDur);
    });
    renderPersistedSelections();
  }

  function positionPasteButton(pasteBtn, box, widget) {
    // Vertical anchor comes from the whole widget (so Frames mode's extra
    // top row is accounted for); horizontal stays centered on the actual
    // text box, which is what the button visually sits above.
    const topRect = (widget || box).getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const btnSize = 30;
    pasteBtn.style.top = `${topRect.top - btnSize + 6}px`;
    pasteBtn.style.left = `${boxRect.left + boxRect.width / 2 - btnSize / 2}px`;
  }

  // Caps the widget (menu button + textarea + other button, stacked) at
  // 150px so a long prompt scrolls the textarea instead of growing the
  // whole bar downward. Flow's own React re-renders can overwrite an
  // element's style attribute wholesale on unrelated state changes, so
  // this is re-applied every tick rather than set once.
  function applyWidgetMaxHeight(widget) {
    if (!widget) return;
    widget.style.maxHeight = '150px';
  }

  function tick() {
    const overlay = ensureOverlay();
    const pasteBtn = ensurePasteButton();
    const box = getPromptBox();
    const widget = box ? getPromptWidget(box) : null;

    observeWidgetFor(widget);
    applyWidgetMaxHeight(widget);

    if (!box) {
      overlay.style.display = 'none';
      pasteBtn.style.display = 'none';
      return;
    }

    overlay.style.display = 'flex';
    syncActiveState(overlay);

    // Flow's own settings panel opens upward, directly above the prompt
    // box — the same spot the paste button lives in — so hide it while
    // that panel is open instead of letting the two overlap.
    if (getPanel()) {
      pasteBtn.style.display = 'none';
      return;
    }

    pasteBtn.style.display = 'flex';
    positionPasteButton(pasteBtn, box, widget);
  }

  // Flow re-renders the prompt widget's DOM as it switches modes (e.g.
  // toggling Frames adds/removes the Start/End row above the box), so the
  // ResizeObserver target has to be re-picked whenever the widget element
  // itself changes — observing a node that got replaced silently stops
  // firing.
  let observedWidget = null;
  const widgetResizeObserver = new ResizeObserver(() => scheduleTick());
  function observeWidgetFor(widget) {
    if (widget === observedWidget) return;
    widgetResizeObserver.disconnect();
    observedWidget = widget;
    if (widget) widgetResizeObserver.observe(widget);
  }

  // Mutations/resizes tend to arrive in bursts (one Flow state change can
  // touch several nodes), so coalesce them into a single tick per frame
  // instead of running the full sync once per individual event.
  let tickScheduled = false;
  function scheduleTick() {
    if (tickScheduled) return;
    tickScheduled = true;
    requestAnimationFrame(() => {
      tickScheduled = false;
      tick();
    });
  }

  new MutationObserver(() => scheduleTick()).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-state', 'aria-expanded'],
  });
  window.addEventListener('resize', scheduleTick);
  window.addEventListener('scroll', scheduleTick, true);

  tick();
})();
