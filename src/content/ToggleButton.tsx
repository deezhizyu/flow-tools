import { usePressed } from './usePressed';

interface ToggleButtonProps {
  open: boolean;
  onToggle: () => void;
  onPointerDown: (ev: PointerEvent) => void;
  onPointerMove: (ev: PointerEvent) => void;
  onPointerUp: () => boolean; // true if the pointer dragged rather than clicked
}

// Sits above the overlay as its open/close control, and doubles as the
// drag handle for the whole widget (button + overlay move together).
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
      id="fqs-toggle-btn"
      class={pressed ? 'fqs-round-btn fqs-pressed' : 'fqs-round-btn'}
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
