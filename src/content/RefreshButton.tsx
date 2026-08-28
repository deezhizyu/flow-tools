import { usePressed } from './usePressed';

interface RefreshButtonProps {
  scanning: boolean;
  onRefresh: () => void;
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// Same round style as ToggleButton, sitting in the same bottom row right
// beside it rather than inside the overlay panel — see #fqs-refresh-btn
// in style.css.
export function RefreshButton(props: RefreshButtonProps) {
  const [pressed, press] = usePressed();
  return (
    <button
      type="button"
      id="fqs-refresh-btn"
      class={cx('fqs-round-btn', props.scanning && 'fqs-spinning', pressed && 'fqs-pressed')}
      onClick={() => press(props.onRefresh)}
      disabled={props.scanning}
      title="Rescan Flow's models and options"
    >
      <span class="google-symbols" aria-hidden="true">
        refresh
      </span>
    </button>
  );
}
