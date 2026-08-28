import { useEffect, useRef, useState } from 'preact/hooks';
import type { ScanResult } from '../lib/models';
import { scanFlow } from './flow-dom';

interface ModelScanState {
  scan: ScanResult | null;
  scanning: boolean;
  refresh: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// A scan that gets interrupted — most commonly the user closing Flow's
// settings menu partway through, which the scan needs open to read from —
// fails fast rather than grinding through every remaining model's full
// wait (see the panel-closed checks in scanFlow/scanVideoMode), and is
// simply retried here a few times rather than left stuck with nothing.
const MAX_ATTEMPTS = 3;

async function scanWithRetries(): Promise<ScanResult | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await scanFlow();
    if (result) return result;
    if (attempt < MAX_ATTEMPTS - 1) await sleep(150);
  }
  return null;
}

// Scans Flow's own settings panel for its currently available models and
// their options once — the first time this account's Flow tab is ever
// opened with the extension installed — rather than every time: the
// result is handed to `onScanned` to persist, and a persisted scan handed
// back in as `persistedScan` is adopted as-is instead of triggering
// another live scan, since Flow's own model/tier lineup rarely changes
// session to session. `refresh` re-runs the scan on demand (wired to the
// overlay's refresh button) and always reports its result via `onScanned`.
export function useModelScan(
  ready: boolean,
  prefsLoaded: boolean,
  persistedScan: ScanResult | null,
  onScanned: (scan: ScanResult) => void
): ModelScanState {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const runningRef = useRef(false);
  const startedRef = useRef(false);

  async function runScan() {
    if (runningRef.current) return;
    runningRef.current = true;
    setScanning(true);
    try {
      const result = await scanWithRetries();
      if (result) {
        setScan(result);
        onScanned(result);
      }
    } finally {
      runningRef.current = false;
      setScanning(false);
    }
  }

  useEffect(() => {
    if (!ready || !prefsLoaded || startedRef.current) return;
    startedRef.current = true;
    if (persistedScan) {
      setScan(persistedScan);
      return;
    }
    void runScan();
  }, [ready, prefsLoaded, persistedScan]);

  return { scan, scanning, refresh: () => void runScan() };
}
