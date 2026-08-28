import { usePressed } from './usePressed';

interface ClearRefsButtonProps {
  top: number;
  left: number;
  visible: boolean;
  onClear: () => void;
}

export function ClearRefsButton(props: ClearRefsButtonProps) {
  const [pressed, press] = usePressed();

  function handleClick(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    press(props.onClear);
  }

  return (
    <button
      type="button"
      id="fqs-clear-refs-btn"
      class={[pressed && 'fqs-pressed', !props.visible && 'fqs-hidden'].filter(Boolean).join(' ')}
      style={{ top: `${props.top}px`, left: `${props.left}px` }}
      title="Clear references (keeps prompt text)"
      onClick={handleClick}
      disabled={!props.visible}
    >
      <span class="fqs-clear-refs-icon">
        <span class="fqs-clear-refs-base">🖼️</span>
        <span class="fqs-clear-refs-overlay">❌</span>
      </span>
    </button>
  );
}
