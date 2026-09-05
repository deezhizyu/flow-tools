import { cx } from '../cx';
import { usePressed } from '../hooks/usePressed';

export interface ActionButtonProps {
  id: string;
  icon: string;
  altIcon?: string;
  showAlt?: boolean;
  title: string;
  visible: boolean;
  onPress: () => void;
}

export function ActionButton(props: ActionButtonProps) {
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
      class={cx('ft-action-btn', pressed && 'ft-pressed')}
      title={props.title}
      onClick={handleClick}
      disabled={!props.visible}
    >
      {props.altIcon ? (
        // Both icons stay mounted and only their opacity toggles, so the
        // transition below has an already-painted "from" state to animate
        // from — swapping the text content of a single <i> can't fade,
        // since there's no property change to transition between.
        <span class="ft-gsym-stack">
          <i class={cx('ft-gsym', props.showAlt && 'ft-gsym-hidden')}>{props.icon}</i>
          <i class={cx('ft-gsym', 'ft-gsym-stacked', !props.showAlt && 'ft-gsym-hidden')}>{props.altIcon}</i>
        </span>
      ) : (
        <i class="ft-gsym">{props.icon}</i>
      )}
    </button>
  );
}
