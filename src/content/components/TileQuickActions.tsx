import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { requestDownload, requestImageDataUrl } from '../../lib/messaging';
import { cx } from '../cx';
import { moveTileToTrash, type TileMedia } from '../flow-dom';
import { usePressed } from '../hooks/usePressed';
import type { TileHoverState } from '../hooks/useTileHover';

// The clipboard API only accepts a handful of MIME types for images (PNG,
// not Flow's JPEG source), so the fetched bytes are re-encoded via canvas.
async function toPngBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

async function copyImageToClipboard(src: string): Promise<void> {
  const dataUrl = await requestImageDataUrl(src);
  if (!dataUrl) return;
  const blob = await (await fetch(dataUrl)).blob();
  const pngBlob = await toPngBlob(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

async function downloadTileMedia(media: TileMedia): Promise<void> {
  await requestDownload(media.src);
}

interface ActionButtonProps {
  id: string;
  icon: string;
  altIcon?: string;
  showAlt?: boolean;
  title: string;
  visible: boolean;
  onPress: () => void;
}

function ActionButton(props: ActionButtonProps) {
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
      class={cx('fqs-tile-action-btn', pressed && 'fqs-pressed')}
      title={props.title}
      onClick={handleClick}
      disabled={!props.visible}
    >
      {props.altIcon ? (
        // Both icons stay mounted and only their opacity toggles, so the
        // transition below has an already-painted "from" state to animate
        // from — swapping the text content of a single <i> can't fade,
        // since there's no property change to transition between.
        <span class="fqs-gsym-stack">
          <i class={cx('fqs-gsym', props.showAlt && 'fqs-gsym-hidden')}>{props.icon}</i>
          <i class={cx('fqs-gsym', 'fqs-gsym-stacked', !props.showAlt && 'fqs-gsym-hidden')}>{props.altIcon}</i>
        </span>
      ) : (
        <i class="fqs-gsym">{props.icon}</i>
      )}
    </button>
  );
}

interface TileQuickActionsProps {
  state: TileHoverState;
}

const COPIED_ICON_MS = 2000;

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
      id: 'fqs-tile-copy-btn',
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
  if (media) {
    buttons.push({
      id: 'fqs-tile-download-btn',
      title: media.type === 'video' ? 'Download video' : 'Download image',
      icon: 'download',
      onPress: () => void downloadTileMedia(media),
      visible: true,
    });
  }
  buttons.push({
    id: 'fqs-tile-trash-btn',
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
  // absolute` in CSS (see .fqs-tile-actions-group) is enough to track the
  // tile's own position — no rect/scroll tracking needed.
  // Kept mounted and toggled via fqs-hidden (rather than removed outright
  // once unhovered) so the opacity transition has something to animate.
  return createPortal(
    <div class={cx('fqs-tile-actions-group', !visible && 'fqs-hidden')}>
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
