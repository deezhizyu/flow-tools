import { FloatingIconButton } from './FloatingIconButton';

interface ClearRefsButtonProps {
  top: number;
  left: number;
  visible: boolean;
  onClear: () => void;
}

export function ClearRefsButton(props: ClearRefsButtonProps) {
  return (
    <FloatingIconButton
      id="ft-clear-refs-btn"
      top={props.top}
      left={props.left}
      visible={props.visible}
      title="Clear references (keeps prompt text)"
      onPress={props.onClear}
    >
      <span class="ft-clear-refs-icon">
        <span class="ft-clear-refs-base">🖼️</span>
        <span class="ft-clear-refs-overlay">❌</span>
      </span>
    </FloatingIconButton>
  );
}
