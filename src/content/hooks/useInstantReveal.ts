import { useEffect } from 'preact/hooks';
import { watchInstantReveal } from '../flow-dom';

export function useInstantReveal(): void {
  useEffect(() => watchInstantReveal(), []);
}
