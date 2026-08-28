import { useEffect, useRef, useState } from 'preact/hooks';

export function usePressed(duration = 300) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function press(action: () => void) {
    setPressed(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPressed(false), duration);
    action();
  }

  return [pressed, press] as const;
}
