import { useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  useFloating,
  autoUpdate,
  shift,
  offset,
  flip,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import {
  MonthView,
  type CalendarEvent,
  type MonthSelectedRange,
} from '@savvycal/calendar';

const tz = 'America/Chicago';
const today = Temporal.Now.plainDateISO(tz);

const COLORS = {
  blue: '#3b82f6',
  violet: '#8b5cf6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  teal: '#14b8a6',
  indigo: '#6366f1',
};

function at(
  date: Temporal.PlainDate,
  hour: number,
  minute = 0
): Temporal.ZonedDateTime {
  return date.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

/**
 * Seeds every month with the same edge cases, positioned by day-of-month so
 * they show up no matter which month is displayed.
 */
function buildMonthEvents(month: Temporal.PlainYearMonth): CalendarEvent[] {
  const first = month.toPlainDate({ day: 1 });
  const last = month.toPlainDate({ day: month.daysInMonth });
  const day = (n: number) => first.add({ days: n - 1 });
  const p = month.toString();
  // First Saturday on or after the 8th, for an overnight event crossing a week row
  const saturday = day(8).add({ days: (6 - day(8).dayOfWeek + 7) % 7 });

  const events: CalendarEvent[] = [
    // Starts in the previous month, continues into the first week
    {
      id: `${p}-trip`,
      title: 'Family trip',
      allDay: true,
      startDate: first.subtract({ days: 3 }),
      endDate: day(3),
      resourceId: '',
      color: COLORS.green,
    },
    // Crosses at least one week boundary
    {
      id: `${p}-launch`,
      title: 'Product launch week',
      allDay: true,
      startDate: day(8),
      endDate: day(14),
      resourceId: '',
      color: COLORS.violet,
    },
    // Spans three week rows
    {
      id: `${p}-leave`,
      title: 'Parental leave',
      allDay: true,
      startDate: day(16),
      endDate: day(29),
      resourceId: '',
      color: COLORS.teal,
    },
    {
      id: `${p}-board`,
      title: 'Board meeting',
      allDay: true,
      startDate: day(10),
      endDate: day(10),
      resourceId: '',
      color: COLORS.indigo,
    },
    // Runs past the end of the month into the trailing days
    {
      id: `${p}-holiday`,
      title: 'Holiday break',
      allDay: true,
      startDate: last.subtract({ days: 1 }),
      endDate: last.add({ days: 4 }),
      resourceId: '',
      color: COLORS.red,
    },
    // Overnight timed event → bar across two days
    {
      id: `${p}-redeye`,
      title: 'Red-eye to NYC',
      startTime: at(day(5), 22, 0),
      endTime: at(day(6), 6, 30),
      resourceId: '',
      color: COLORS.blue,
    },
    // Ends exactly at midnight → stays a single-day item
    {
      id: `${p}-deploy`,
      title: 'Late deploy',
      startTime: at(day(6), 21, 0),
      endTime: at(day(7), 0, 0),
      resourceId: '',
      color: COLORS.amber,
    },
    // Overnight across a week row boundary
    {
      id: `${p}-stargazing`,
      title: 'Stargazing',
      startTime: at(saturday, 22, 0),
      endTime: at(saturday.add({ days: 1 }), 2, 0),
      resourceId: '',
      color: COLORS.indigo,
    },
    // Multi-day timed conference
    {
      id: `${p}-conf`,
      title: 'SaaS conference',
      startTime: at(day(20), 9, 0),
      endTime: at(day(22), 17, 0),
      resourceId: '',
      color: COLORS.pink,
    },
    // Status variants and missing color
    {
      id: `${p}-canceled`,
      title: 'Dentist',
      startTime: at(day(9), 10, 0),
      endTime: at(day(9), 11, 0),
      resourceId: '',
      color: COLORS.red,
      status: 'canceled',
    },
    {
      id: `${p}-tentative`,
      title: 'Maybe: coffee',
      startTime: at(day(9), 14, 0),
      endTime: at(day(9), 14, 30),
      resourceId: '',
      color: COLORS.amber,
      status: 'tentative',
    },
    {
      id: `${p}-tentative-allday`,
      title: 'Tentative hold',
      allDay: true,
      startDate: day(15),
      endDate: day(15),
      resourceId: '',
      color: COLORS.blue,
      status: 'tentative',
    },
    {
      id: `${p}-nocolor`,
      title: 'No color event',
      startTime: at(day(15), 11, 0),
      endTime: at(day(15), 12, 0),
      resourceId: '',
    },
    {
      id: `${p}-long-title`,
      title:
        'Quarterly business review with the extended leadership team and partners',
      startTime: at(day(18), 13, 0),
      endTime: at(day(18), 15, 0),
      resourceId: '',
      color: COLORS.violet,
    },
    {
      id: `${p}-lunch`,
      title: 'Lunch with Sam',
      startTime: at(day(13), 12, 0),
      endTime: at(day(13), 13, 0),
      resourceId: '',
      color: COLORS.green,
    },
    {
      id: `${p}-gym`,
      title: 'Gym',
      startTime: at(day(13), 7, 0),
      endTime: at(day(13), 8, 0),
      resourceId: '',
      color: COLORS.teal,
    },
    // Stacked bars + timed items so bars get hidden in compact mode
    {
      id: `${p}-offsite`,
      title: 'Team offsite',
      allDay: true,
      startDate: day(24),
      endDate: day(26),
      resourceId: '',
      color: COLORS.amber,
    },
    {
      id: `${p}-hackathon`,
      title: 'Hackathon',
      allDay: true,
      startDate: day(24),
      endDate: day(25),
      resourceId: '',
      color: COLORS.pink,
    },
    {
      id: `${p}-deadline`,
      title: 'Grant deadline',
      allDay: true,
      startDate: day(24),
      endDate: day(24),
      resourceId: '',
      color: COLORS.red,
    },
    ...[9, 11, 15].map((hour, i): CalendarEvent => ({
      id: `${p}-d24-${i}`,
      title: ['Kickoff', 'Demo prep', 'Judging'][i],
      startTime: at(day(24), hour, 0),
      endTime: at(day(24), hour + 1, 0),
      resourceId: '',
      color: COLORS.blue,
    })),
    // Events on the leading/trailing days outside the month
    {
      id: `${p}-prev-month`,
      title: 'Prev month event',
      startTime: at(first.subtract({ days: 1 }), 15, 0),
      endTime: at(first.subtract({ days: 1 }), 16, 0),
      resourceId: '',
      color: COLORS.green,
    },
    {
      id: `${p}-next-month`,
      title: 'Next month event',
      startTime: at(last.add({ days: 1 }), 10, 0),
      endTime: at(last.add({ days: 1 }), 11, 0),
      resourceId: '',
      color: COLORS.violet,
    },
  ];

  // A day with far more events than fit in the cell
  const busy = day(12);
  const busyTitles = [
    'Standup',
    'Design review',
    'Hiring sync',
    'Customer call: Acme',
    'Lunch',
    'Pairing',
    'Roadmap planning',
    'Customer call: Globex',
    'Retro',
    'Dinner',
  ];
  busyTitles.forEach((title, i) => {
    const hour = 8 + i;
    events.push({
      id: `${p}-busy-${i}`,
      title,
      startTime: at(busy, hour, i % 2 === 0 ? 0 : 30),
      endTime: at(busy, hour + 1, 0),
      resourceId: '',
      color: Object.values(COLORS)[i % 8],
    });
  });
  events.push({
    id: `${p}-busy-allday`,
    title: 'Office hours',
    allDay: true,
    startDate: busy,
    endDate: busy,
    resourceId: '',
    color: COLORS.teal,
  });

  return events;
}

// Events anchored to today so the today highlight has company
const todayEvents: CalendarEvent[] = [
  {
    id: 'today-standup',
    title: 'Standup',
    startTime: at(today, 9, 30),
    endTime: at(today, 9, 45),
    resourceId: '',
    color: COLORS.blue,
  },
  {
    id: 'today-1on1',
    title: '1:1 with Jordan',
    startTime: at(today, 14, 0),
    endTime: at(today, 14, 30),
    resourceId: '',
    color: COLORS.violet,
  },
];

function formatDate(date: Temporal.PlainDate) {
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function formatRange({ startDate, endDate }: MonthSelectedRange) {
  return Temporal.PlainDate.compare(startDate, endDate) === 0
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function formatEventWhen(event: CalendarEvent) {
  if (event.allDay) {
    return Temporal.PlainDate.compare(event.startDate, event.endDate) === 0
      ? `${formatDate(event.startDate)}, all day`
      : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`;
  }
  const fmt = (t: Temporal.ZonedDateTime) =>
    t.withTimeZone(tz).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${fmt(event.startTime)} – ${fmt(event.endTime)}`;
}

function Toggle<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
      {options.map(([key, label]) => (
        <button
          key={String(key)}
          onClick={() => onChange(key)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === key
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function MonthPage() {
  const [month, setMonth] = useState(() => today.toPlainYearMonth());
  const [weekStartsOn, setWeekStartsOn] = useState(7);
  const [fixedWeekCount, setFixedWeekCount] = useState(false);
  const [size, setSize] = useState<'tall' | 'compact'>('tall');
  const [selectedRange, setSelectedRange] = useState<MonthSelectedRange | null>(
    null
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [log, setLog] = useState<string>('Click, drag, or open "+N more".');

  const events = useMemo(
    () => [
      ...buildMonthEvents(month.subtract({ months: 1 })),
      ...buildMonthEvents(month),
      ...buildMonthEvents(month.add({ months: 1 })),
      ...todayEvents,
    ],
    [month]
  );
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const {
    context: eventContext,
    refs: { setReference: setEventRef, setFloating: setEventFloating },
    floatingStyles: eventFloatingStyles,
  } = useFloating({
    open: selectedEventId !== null,
    onOpenChange: (open) => {
      if (!open) setSelectedEventId(null);
    },
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    placement: 'right-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });
  const eventInteractions = useInteractions([useDismiss(eventContext)]);

  const {
    context: selectionContext,
    refs: { setReference: setSelectionRef, setFloating: setSelectionFloating },
    floatingStyles: selectionFloatingStyles,
  } = useFloating({
    open: selectedRange !== null,
    onOpenChange: (open) => {
      if (!open) setSelectedRange(null);
    },
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    placement: 'right-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });
  const selectionInteractions = useInteractions([useDismiss(selectionContext)]);

  const monthLabel = month
    .toPlainDate({ day: 1 })
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(month.subtract({ months: 1 }))}
            className="rounded border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-sm text-zinc-950 dark:text-zinc-50"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={() => setMonth(today.toPlainYearMonth())}
            className="rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-sm text-zinc-950 dark:text-zinc-50"
          >
            Today
          </button>
          <button
            onClick={() => setMonth(month.add({ months: 1 }))}
            className="rounded border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-sm text-zinc-950 dark:text-zinc-50"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <h2 className="min-w-40 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          {monthLabel}
        </h2>
        <Toggle
          value={weekStartsOn}
          onChange={setWeekStartsOn}
          options={[
            [7, 'Sun start'],
            [1, 'Mon start'],
          ]}
        />
        <Toggle
          value={fixedWeekCount ? 'fixed' : 'auto'}
          onChange={(v) => setFixedWeekCount(v === 'fixed')}
          options={[
            ['auto', 'Fit weeks'],
            ['fixed', '6 weeks'],
          ]}
        />
        <Toggle
          value={size}
          onChange={setSize}
          options={[
            ['tall', 'Tall'],
            ['compact', 'Compact'],
          ]}
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{log}</span>
      </div>

      <div
        className={
          size === 'tall'
            ? 'h-[calc(100vh-12rem)] min-h-150 border border-zinc-200 dark:border-zinc-700'
            : 'h-120 border border-zinc-200 dark:border-zinc-700'
        }
      >
        <MonthView
          month={month}
          timeZone={tz}
          events={events}
          weekStartsOn={weekStartsOn}
          fixedWeekCount={fixedWeekCount}
          className="h-full"
          selectedRange={selectedRange}
          onSelect={(range) => {
            setSelectedRange(range);
            if (range) {
              setSelectedEventId(null);
              setLog(`Selected ${formatRange(range)}`);
            }
          }}
          selectionRef={setSelectionRef}
          selectionAppearance={{
            style: 'event',
            eventData: { color: COLORS.blue },
          }}
          selectedEventId={selectedEventId}
          selectedEventRef={setEventRef}
          onEventClick={(event) => {
            setSelectedEventId(event.id);
            setLog(`Clicked "${String(event.title)}"`);
          }}
          onDayNumberClick={(date) => setLog(`Navigate to ${formatDate(date)}`)}
          onOverflowClick={(info) =>
            setLog(
              `Opened ${info.events.length} events on ${formatDate(info.date)}`
            )
          }
        />
      </div>

      {selectedEvent && (
        <div
          ref={setEventFloating}
          style={eventFloatingStyles}
          {...eventInteractions.getFloatingProps()}
          className="z-50 w-64 rounded-lg ring ring-zinc-900/10 bg-white p-4 shadow-lg dark:bg-zinc-800"
        >
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {selectedEvent.title}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {formatEventWhen(selectedEvent)}
          </p>
        </div>
      )}

      {selectedRange && (
        <div
          ref={setSelectionFloating}
          style={selectionFloatingStyles}
          {...selectionInteractions.getFloatingProps()}
          className="z-50 rounded-lg ring ring-zinc-900/10 bg-white p-4 shadow-lg dark:bg-zinc-800"
        >
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            New all-day event
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {formatRange(selectedRange)}
          </p>
        </div>
      )}
    </div>
  );
}
