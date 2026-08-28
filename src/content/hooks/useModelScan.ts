import { useEffect, useRef, useState } from 'preact/hooks';
import { sleep } from '../../lib/async';
import type { ScanResult } from '../../lib/models';
import { scanFlow } from '../flow-dom';

interface ModelScanState {
  scan: ScanResult | null;
  scanning: boolean;
  refresh: () => void;
}

const MAX_ATTEMPTS = 3;

async function scanWithRetries(): Promise<ScanResult | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await scanFlow();
    if (result) return result;
    if (attempt < MAX_ATTEMPTS - 1) await sleep(150);
  }
  return null;
}

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
