import { useState } from 'react';
import {
  useFloating,
  autoUpdate,
  shift,
  offset,
  flip,
  useTransitionStyles,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import type { CalendarEvent, EventDrop } from '@savvycal/calendar';

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

// Holds a dropped event until the user confirms or cancels the move in a
// popover next to it.
export function useDropConfirm(
  setEvents: (update: (events: CalendarEvent[]) => CalendarEvent[]) => void,
  resourceName?: (resourceId: string) => string | undefined
) {
  const [pendingDrop, setPendingDrop] = useState<EventDrop | null>(null);

  const {
    context,
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    open: pendingDrop !== null,
    onOpenChange: (open) => {
      if (!open) setPendingDrop(null);
    },
    middleware: [flip({ crossAxis: true }), shift(), offset(5)],
    placement: 'right',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);
  const { isMounted, styles } = useTransitionStyles(context, {
    duration: { open: 200, close: 100 },
    initial: { opacity: 0 },
  });

  const confirm = () => {
    if (!pendingDrop) return;
    const { event, resourceId, startTime, endTime } = pendingDrop;
    setEvents((events) =>
      events.map((e) =>
        e.id === event.id ? { ...event, resourceId, startTime, endTime } : e
      )
    );
    setPendingDrop(null);
  };

  const popover = isMounted && (
    <div
      ref={setFloating}
      style={{ ...floatingStyles, ...styles }}
      {...getFloatingProps()}
      className="z-50 w-64 rounded-lg ring ring-zinc-900/10 bg-white p-4 shadow-lg dark:bg-zinc-800"
    >
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Move this event?
      </p>
      {pendingDrop && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {pendingDrop.event.title} to{' '}
          {timeFormat.format(new Date(pendingDrop.startTime.epochMilliseconds))}
          {resourceName &&
            pendingDrop.resourceId !== pendingDrop.event.resourceId &&
            ` with ${resourceName(pendingDrop.resourceId)}`}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          onClick={confirm}
        >
          Move
        </button>
        <button
          className="rounded px-3 py-1 text-sm font-medium text-zinc-700 ring ring-zinc-900/10 hover:bg-zinc-50 dark:text-zinc-200"
          onClick={() => setPendingDrop(null)}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return {
    pendingDrop,
    onEventDrop: setPendingDrop,
    pendingDropRef: setReference,
    popover,
  };
}
