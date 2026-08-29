import { cx } from '../cx';
import { usePressed } from '../hooks/usePressed';

interface RefreshButtonProps {
  scanning: boolean;
  onRefresh: () => void;
  visible: boolean;
}

export function RefreshButton(props: RefreshButtonProps) {
  const [pressed, press] = usePressed();
  return (
    <button
      type="button"
      id="ft-refresh-btn"
      class={cx('ft-round-btn', props.scanning && 'ft-spinning', pressed && 'ft-pressed', !props.visible && 'ft-hidden')}
      onClick={() => press(props.onRefresh)}
      disabled={props.scanning || !props.visible}
      title="Rescan Flow's models and options"
    >
      <span class="google-symbols" aria-hidden="true">
        refresh
      </span>
    </button>
  );
}
