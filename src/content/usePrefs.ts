import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_PREFS, sendMessage, type Prefs } from '../lib/messaging';
import type { Amount, VideoMode } from '../lib/models';

// Local mirror of the background worker's persisted preferences. Writes
// are optimistic, then reconciled with whatever the worker actually
// persisted (it validates/normalizes before responding).
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    sendMessage({ type: 'GET_PREFS' }).then(setPrefs);
  }, []);

  function update(message: Extract<Parameters<typeof sendMessage>[0], { type: 'SET_PREF' }>) {
    if (prefs[message.key] === message.value) return;
    setPrefs((p) => ({ ...p, [message.key]: message.value }));
    sendMessage(message).then(setPrefs);
  }

  return {
    prefs,
    setNanoModel: (value: string) => update({ type: 'SET_PREF', key: 'nanoModel', value }),
    setVeoModel: (value: string) => update({ type: 'SET_PREF', key: 'veoModel', value }),
    setVeoVideoMode: (value: VideoMode) => update({ type: 'SET_PREF', key: 'veoVideoMode', value }),
    setOmniVideoMode: (value: VideoMode) => update({ type: 'SET_PREF', key: 'omniVideoMode', value }),
    setVeoAmount: (value: Amount) => update({ type: 'SET_PREF', key: 'veoAmount', value }),
    setOmniAmount: (value: Amount) => update({ type: 'SET_PREF', key: 'omniAmount', value }),
    setOverlayOpen: (value: boolean) => update({ type: 'SET_PREF', key: 'overlayOpen', value }),
  };
}
