import { useEffect, useRef, useState } from 'preact/hooks';
import { scanFlow, type ScanResult } from './flow-dom';

interface ModelScanState {
  scan: ScanResult | null;
  scanning: boolean;
  refresh: () => void;
}

// Scans Flow's own settings panel for its currently available models and
// their options as soon as Flow's prompt UI is ready — i.e. before the
// user has had a chance to open the overlay for the first time — so the
// overlay's buttons reflect this account's actual tier/variant set from
// the moment it's shown, rather than a hardcoded guess. `refresh` re-runs
// the same scan on demand (wired to the overlay's refresh button).
export function useModelScan(ready: boolean): ModelScanState {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const runningRef = useRef(false);
  const startedRef = useRef(false);

  async function runScan() {
    if (runningRef.current) return;
    runningRef.current = true;
    setScanning(true);
    try {
      const result = await scanFlow();
      if (result) setScan(result);
    } finally {
      runningRef.current = false;
      setScanning(false);
    }
  }

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    void runScan();
  }, [ready]);

  return { scan, scanning, refresh: () => void runScan() };
}
