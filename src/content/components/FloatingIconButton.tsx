import type { ComponentChildren } from 'preact';
import { cx } from '../cx';
import { usePressed } from '../hooks/usePressed';

interface FloatingIconButtonProps {
  id: string;
  top: number;
  left: number;
  visible: boolean;
  title: string;
  onPress: () => void;
  children: ComponentChildren;
}

// Shared shell for the paste/clear-references buttons — floating, pixel-
// positioned icon buttons that fade with Flow's own settings panel (see
// #fqs-widget's fade rule in style.css).
export function FloatingIconButton(props: FloatingIconButtonProps) {
  const [pressed, press] = usePressed();

  function handleClick(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    press(props.onPress);
  }

  return (
    <button
      type="button"
      id={props.id}
      class={cx('fqs-floating-btn', pressed && 'fqs-pressed', !props.visible && 'fqs-hidden')}
      style={{ top: `${props.top}px`, left: `${props.left}px` }}
      title={props.title}
      onClick={handleClick}
      disabled={!props.visible}
    >
      {props.children}
    </button>
  );
}
