import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { copyImageToClipboard } from '../clipboard';
import { cx } from '../cx';
import { moveTileToTrash } from '../flow-dom';
import type { TileHoverState } from '../hooks/useTileHover';
import { ActionButton } from './ActionButton';

const COPIED_ICON_MS = 2000;

interface TileQuickActionsProps {
  state: TileHoverState;
}

export function TileQuickActions(props: TileQuickActionsProps) {
  const [trashing, setTrashing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { media, tile, visible } = props.state;

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  // Flow's own tile card is position:static, so an absolutely-positioned
  // child (below) would escape to whatever positioned ancestor Flow happens
  // to have further up instead of anchoring to this tile — nudge it to
  // `relative` only when needed, since it already has an explicit position
  // when one of Flow's own states requires it. useLayoutEffect (not
  // useEffect) so this lands before paint — otherwise the very first frame
  // could render the group positioned against the wrong ancestor.
  useLayoutEffect(() => {
    if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';
  }, [tile]);

  // The tile can disappear out from under a fading-out group (e.g. right
  // after a trash action) — nothing to portal into at that point.
  if (!tile.isConnected) return null;

  const buttons: { id: string; title: string; icon: string; altIcon?: string; showAlt?: boolean; onPress: () => void; visible: boolean }[] = [];
  if (media?.type === 'image') {
    buttons.push({
      id: 'ft-tile-copy-btn',
      title: 'Copy image',
      icon: 'content_copy',
      altIcon: 'check',
      showAlt: copied,
      onPress: () => {
        void copyImageToClipboard(media.src).then(() => {
          setCopied(true);
          clearTimeout(copiedTimer.current);
          copiedTimer.current = setTimeout(() => setCopied(false), COPIED_ICON_MS);
        });
      },
      visible: true,
    });
  }
  buttons.push({
    id: 'ft-tile-trash-btn',
    title: 'Move to trash',
    icon: 'delete',
    onPress: () => {
      if (trashing) return;
      setTrashing(true);
      void moveTileToTrash(tile).finally(() => setTrashing(false));
    },
    visible: !trashing,
  });

  // Portaled into the tile itself (rather than rendered alongside the rest
  // of the widget tree) so hovering these buttons keeps the pointer inside
  // the tile's own DOM subtree — otherwise Flow's real :hover state (which
  // drives its own favorite/reuse/more_vert row) drops the moment the
  // pointer leaves the tile for a separately-positioned sibling elsewhere in
  // body. Being an actual child of the tile also means plain `position:
  // absolute` in CSS (see .ft-tile-actions-group) is enough to track the
  // tile's own position — no rect/scroll tracking needed.
  // Kept mounted and toggled via ft-hidden (rather than removed outright
  // once unhovered) so the opacity transition has something to animate.
  return createPortal(
    <div class={cx('ft-tile-actions-group', !visible && 'ft-hidden')}>
      {buttons.map((btn) => (
        <ActionButton
          key={btn.id}
          id={btn.id}
          icon={btn.icon}
          altIcon={btn.altIcon}
          showAlt={btn.showAlt}
          title={btn.title}
          visible={visible && btn.visible}
          onPress={btn.onPress}
        />
      ))}
    </div>,
    tile
  );
}
