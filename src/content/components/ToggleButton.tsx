import { cx } from '../cx';
import { usePressed } from '../hooks/usePressed';

interface ToggleButtonProps {
  open: boolean;
  onToggle: () => void;
  onPointerDown: (ev: PointerEvent) => void;
  onPointerMove: (ev: PointerEvent) => void;
  onPointerUp: () => boolean;
}

export function ToggleButton(props: ToggleButtonProps) {
  const [pressed, press] = usePressed();

  function handlePointerUp(ev: PointerEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!props.onPointerUp()) press(props.onToggle);
  }

  return (
    <button
      type="button"
      id="ft-toggle-btn"
      class={cx('ft-round-btn', pressed && 'ft-pressed')}
      title={props.open ? 'Hide overlay' : 'Show overlay'}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={handlePointerUp}
    >
      <span class="google-symbols" aria-hidden="true">
        {props.open ? 'remove' : 'add'}
      </span>
    </button>
  );
}
