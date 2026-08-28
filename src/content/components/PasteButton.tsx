import { FloatingIconButton } from './FloatingIconButton';

interface PasteButtonProps {
  top: number;
  left: number;
  visible: boolean;
  onPaste: () => void;
}

export function PasteButton(props: PasteButtonProps) {
  return (
    <FloatingIconButton
      id="fqs-paste-btn"
      top={props.top}
      left={props.left}
      visible={props.visible}
      title="Paste prompt from clipboard"
      onPress={props.onPaste}
    >
      📋
    </FloatingIconButton>
  );
}
