import { usePressed } from './usePressed';

interface PasteButtonProps {
  top: number;
  left: number;
  onPaste: () => void;
}

export function PasteButton(props: PasteButtonProps) {
  const [pressed, press] = usePressed();

  function handleClick(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    press(props.onPaste);
  }

  return (
    <button
      type="button"
      id="fqs-paste-btn"
      class={pressed ? 'fqs-pressed' : ''}
      style={{ top: `${props.top}px`, left: `${props.left}px` }}
      title="Paste prompt from clipboard"
      onClick={handleClick}
    >
      📋
    </button>
  );
}
