import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { copyImageToClipboard } from '../clipboard';
import { cx } from '../cx';
import type { ReferenceHoverState } from '../hooks/useReferenceHover';
import { ActionButton } from './ActionButton';

const COPIED_ICON_MS = 2000;

interface ReferenceQuickActionsProps {
  state: ReferenceHoverState;
}

export function ReferenceQuickActions(props: ReferenceQuickActionsProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { card, imageSrc, visible } = props.state;

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  // Same reasoning as TileQuickActions: the preview card is position:static
  // by default, so an absolutely-positioned child needs it nudged to
  // relative to anchor against the card itself rather than an ancestor.
  useLayoutEffect(() => {
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
  }, [card]);

  if (!card.isConnected || !imageSrc) return null;

  return createPortal(
    <div class={cx('ft-reference-actions-group', !visible && 'ft-hidden')}>
      <ActionButton
        id="ft-reference-copy-btn"
        icon="content_copy"
        altIcon="check"
        showAlt={copied}
        title="Copy image"
        visible={visible}
        onPress={() => {
          void copyImageToClipboard(imageSrc).then(() => {
            setCopied(true);
            clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(false), COPIED_ICON_MS);
          });
        }}
      />
    </div>,
    card
  );
}
