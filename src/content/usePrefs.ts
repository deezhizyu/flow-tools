import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_PREFS, sendMessage, type Point, type Prefs } from '../lib/messaging';
import type { Amount, ScanResult, SectionId, VideoMode } from '../lib/models';

// Local mirror of the background worker's persisted preferences. Writes
// are optimistic, then reconciled with whatever the worker actually
// persisted (it validates/normalizes before responding).
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  // Whether the initial GET_PREFS has resolved — callers that need to tell
  // "no persisted value yet" apart from "still loading" (e.g. useModelScan
  // deciding whether to trust an empty `scan`) wait on this first.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    sendMessage({ type: 'GET_PREFS' }).then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, []);

  function update(message: Extract<Parameters<typeof sendMessage>[0], { type: 'SET_PREF' }>) {
    if (prefs[message.key] === message.value) return;
    setPrefs((p) => ({ ...p, [message.key]: message.value }));
    sendMessage(message).then(setPrefs);
  }

  return {
    prefs,
    loaded,
    setNanoModel: (value: string) => update({ type: 'SET_PREF', key: 'nanoModel', value }),
    setVeoModel: (value: string) => update({ type: 'SET_PREF', key: 'veoModel', value }),
    setOmniModel: (value: string | null) => update({ type: 'SET_PREF', key: 'omniModel', value }),
    setOmniResolution: (value: string | null) => update({ type: 'SET_PREF', key: 'omniResolution', value }),
    setVeoVideoMode: (value: VideoMode) => update({ type: 'SET_PREF', key: 'veoVideoMode', value }),
    setOmniVideoMode: (value: VideoMode) => update({ type: 'SET_PREF', key: 'omniVideoMode', value }),
    setVeoAmount: (value: Amount) => update({ type: 'SET_PREF', key: 'veoAmount', value }),
    setOmniAmount: (value: Amount) => update({ type: 'SET_PREF', key: 'omniAmount', value }),
    setOverlayOpen: (value: boolean) => update({ type: 'SET_PREF', key: 'overlayOpen', value }),
    setButtonOffset: (value: Point) => update({ type: 'SET_PREF', key: 'buttonOffset', value }),
    setSectionExpanded: (id: SectionId, value: boolean) =>
      update({ type: 'SET_PREF', key: 'sectionsExpanded', value: { ...prefs.sectionsExpanded, [id]: value } }),
    setScan: (value: ScanResult) => update({ type: 'SET_PREF', key: 'scan', value }),
  };
}
