import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  subscribeToDrawing,
  updateDrawing,
  type DrawingState,
  type DrawingAction,
  type DoodleRoom,
} from './doodleClashRooms';

import {
  sendPreview,
  subscribeToPreview,
  type StrokePreview,
} from './liveDrawing';

import type {
  Stroke,
} from './types';

type PendingAction = {
  matchNumber: number;
  action: DrawingAction;
  stroke?: Stroke;
};

const MAX_PENDING = 30;
const PREVIEW_INTERVAL = 300;

export function useDrawingSync(
  code: string,
  room: DoodleRoom | null,
  member: boolean,
  isArtist: boolean,
) {
  const [drawing, setDrawing] =
    useState<DrawingState | null>(null);

  const [pending, setPending] =
    useState<Stroke[]>([]);

  const [preview, setPreview] =
    useState<StrokePreview | null>(null);

  const [queued, setQueued] =
    useState(0);

  const [error, setError] =
    useState('');

  const latest =
    useRef<DrawingState | null>(null);

  const queue =
    useRef<PendingAction[]>([]);

  const processing = useRef(false);
  const previewProcessing = useRef(false);
  const lastPreview = useRef(0);
  const active = useRef(true);

  const context = useRef({
    matchNumber: room?.matchNumber,
    isArtist,
  });

  context.current = {
    matchNumber: room?.matchNumber,
    isArtist,
  };

  function accept(
    incoming: DrawingState | null,
  ) {
    if (!incoming || !active.current) return;

    const previous = latest.current;

    if (
      previous &&
      (
        incoming.matchNumber <
          previous.matchNumber ||
        (
          incoming.matchNumber ===
            previous.matchNumber &&
          incoming.revision < previous.revision
        )
      )
    ) {
      return;
    }

    latest.current = incoming;
    setDrawing(incoming);

    setPending(previousPending =>
      previousPending.filter(
        item => !incoming.strokes.some(
          stroke => stroke.id === item.id,
        ),
      ),
    );
  }

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
      queue.current = [];
    };
  }, []);

  useEffect(() => {
    if (!member) return;

    return subscribeToDrawing(
      code,
      accept,
      setError,
    );
  }, [code, member]);

  useEffect(() => {
    if (!member || isArtist) {
      setPreview(null);
      return;
    }

    return subscribeToPreview(
      code,
      setPreview,
      setError,
    );
  }, [code, member, isArtist]);

  useEffect(() => {
    if (!preview) return;

    const timer = setTimeout(
      () => setPreview(null),
      5000,
    );

    return () => clearTimeout(timer);
  }, [preview]);

  useEffect(() => {
    queue.current = [];
    setQueued(0);
    setPending([]);
    setPreview(null);
    setError('');
  }, [room?.matchNumber, isArtist]);

  async function drain() {
    if (processing.current) return;

    processing.current = true;

    try {
      while (
        active.current &&
        queue.current.length
      ) {
        const job = queue.current.shift()!;

        const current = latest.current;

        try {
          if (
            !context.current.isArtist ||
            !current ||
            current.matchNumber !== job.matchNumber ||
            context.current.matchNumber !== job.matchNumber
          ) {
            continue;
          }

          const updated = await updateDrawing(
            code,
            current,
            job.action,
            job.stroke,
          );

          if (
            context.current.matchNumber ===
            updated.matchNumber
          ) {
            accept(updated);
          }
        } catch (reason) {
          if (active.current) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Drawing synchronization failed.',
            );
          }
        } finally {
          if (active.current) {
            if (job.stroke) {
              setPending(previous =>
                previous.filter(
                  item => item.id !== job.stroke?.id,
                ),
              );
            }

            setQueued(queue.current.length);
          }
        }
      }
    } finally {
      processing.current = false;
      if (active.current) {
        setQueued(queue.current.length);
      }
    }
  }

  function enqueue(
    action: DrawingAction,
    stroke?: Stroke,
  ) {
    const current = latest.current;

    if (
      !context.current.isArtist ||
      !current ||
      current.matchNumber !==
        context.current.matchNumber
    ) {
      return;
    }

    if (queue.current.length >= MAX_PENDING) {
      setError(
        'Connection is slow. Allow the drawing to synchronize.',
      );
      return;
    }

    if (
      action !== 'add' &&
      (
        processing.current ||
        queue.current.length > 0
      )
    ) {
      return;
    }

    setError('');

    if (stroke) {
      setPending(previous => [
        ...previous,
        stroke,
      ]);
    }

    queue.current.push({
      matchNumber: current.matchNumber,
      action,
      stroke,
    });

    setQueued(queue.current.length + 1);

    void drain();
  }

  function progress(stroke: Stroke) {
    const current = latest.current;
    const now = Date.now();

    if (
      !context.current.isArtist ||
      !current ||
      current.matchNumber !== context.current.matchNumber ||
      processing.current ||
      previewProcessing.current ||
      now - lastPreview.current < PREVIEW_INTERVAL
    ) {
      return;
    }

    lastPreview.current = now;
    previewProcessing.current = true;

    void sendPreview(
      code,
      current.matchNumber,
      current.revision,
      stroke,
    )
      .catch(() => {
        // Temporary previews are best-effort.
        // Final strokes still use the saved queue.
      })
      .finally(() => {
        previewProcessing.current = false;
      });
  }

  const synchronized =
    !!drawing &&
    drawing.matchNumber === room?.matchNumber;

  const saved = synchronized
    ? drawing.strokes
    : [];

  const strokes = [
    ...saved,
    ...(isArtist
      ? pending.filter(
          item => !saved.some(
            stroke => stroke.id === item.id,
          ),
        )
      : []),
  ];

  if (
    !isArtist &&
    synchronized &&
    room?.phase === 'drawing' &&
    preview &&
    preview.matchNumber === drawing.matchNumber &&
    preview.revision === drawing.revision &&
    !saved.some(
      stroke => stroke.id === preview.stroke.id,
    )
  ) {
    strokes.push(preview.stroke);
  }

  return {
    drawing,
    strokes,
    synchronized,
    queued,
    error,
    enqueue,
    progress,
  };
}
