import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import type { ArenaHandle } from './TreasureScene';

export type ArenaRef = { openChest: (index: number) => boolean };
export const Arena = forwardRef<
  ArenaRef,
  { room: RoomView; onChest: () => void; onStatus: (status: 'ready' | 'failed') => void }
>(function Arena({ room, onChest, onStatus }, ref) {
  const element = useRef<HTMLDivElement>(null);
  const engine = useRef<ArenaHandle | null>(null);
  const latest = useRef(room);
  const callback = useRef(onChest);
  const statusCallback = useRef(onStatus);
  const [failed, setFailed] = useState(false);
  latest.current = room;
  callback.current = onChest;
  statusCallback.current = onStatus;
  useImperativeHandle(
    ref,
    () => ({
      openChest: (index) => {
        if (!engine.current) return false;
        engine.current.openChest(index);
        return true;
      },
    }),
    [],
  );
  useEffect(() => {
    let disposed = false;
    let owned: ArenaHandle | undefined;
    void import('./TreasureScene')
      .then(({ createArena }) => {
        if (disposed || !element.current) return;
        owned = createArena(
          element.current,
          latest.current,
          () => callback.current(),
          (handle) => {
            if (disposed) return;
            engine.current = handle;
            handle.sync(latest.current);
            statusCallback.current('ready');
          },
          () => {
            if (!disposed) {
              setFailed(true);
              statusCallback.current('failed');
            }
          },
        );
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true);
          statusCallback.current('failed');
        }
      });
    return () => {
      disposed = true;
      engine.current = null;
      owned?.destroy();
    };
  }, []);
  useEffect(() => {
    engine.current?.sync(room);
  }, [room]);
  return (
    <div className="gold-arena" ref={element} aria-hidden="true">
      {failed && (
        <div className="arena-fallback">
          Không tải được đồ họa. Bạn vẫn có thể chơi bằng các nút bên dưới.
        </div>
      )}
    </div>
  );
});
