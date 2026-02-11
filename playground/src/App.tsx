import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  useFloating,
  autoUpdate,
  shift,
  offset,
  limitShift,
  flip,
  size,
  useTransitionStyles,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import {
  ResourceGridView,
  DayGridView,
  type CalendarResource,
  type CalendarEvent,
  type AvailabilityRange,
  type SelectedRange,
  type DayGridSelectedRange,
  type EventLayout,
} from '@savvycal/calendar';
import StressTestPage from './StressTestPage';

type Page = 'demo' | 'stress-test';

const tz = 'America/Chicago';

// Use today's date so the now indicator renders
const today = Temporal.Now.plainDateISO(tz);

function makeTime(hour: number, minute = 0): Temporal.ZonedDateTime {
  return today.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

const tomorrow = today.add({ days: 1 });

function makeTomorrowTime(hour: number, minute = 0): Temporal.ZonedDateTime {
  return tomorrow.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

const resources: CalendarResource[] = [
  {
    id: '1',
    name: 'Dr. Smith',
    color: '#3b82f6',
    avatarUrl: 'https://i.pravatar.cc/48?u=smith',
  },
  {
    id: '2',
    name: 'Dr. Johnson',
    color: '#8b5cf6',
    avatarUrl: 'https://i.pravatar.cc/48?u=johnson',
  },
  {
    id: '3',
    name: 'Dr. Williams',
    color: '#10b981',
    avatarUrl: 'https://i.pravatar.cc/48?u=williams',
  },
  {
    id: '4',
    name: 'Dr. Brown',
    color: '#f59e0b',
    avatarUrl: 'https://i.pravatar.cc/48?u=brown',
  },
  {
    id: '5',
    name: 'Dr. Davis',
    color: '#ef4444',
    avatarUrl: 'https://i.pravatar.cc/48?u=davis',
  },
];

const events: CalendarEvent[] = [
  // Resource 1: 2-event overlap
  {
    id: '1',
    title: 'Annual Checkup',
    startTime: makeTime(9, 0),
    endTime: makeTime(9, 45),
    resourceId: '1',
    clientName: 'Alice Thompson',
  },
  {
    id: '2',
    title: 'Walk-in Patient',
    startTime: makeTime(9, 15),
    endTime: makeTime(9, 45),
    resourceId: '1',
    clientName: 'Bob Barker',
    status: 'canceled',
  },
  {
    id: '3',
    title: 'Follow-up',
    startTime: makeTime(14, 0),
    endTime: makeTime(14, 30),
    resourceId: '1',
    clientName: 'Charlie Davis',
  },

  // Resource 2: non-overlapping events
  {
    id: '4',
    title: 'Consultation',
    startTime: makeTime(10, 0),
    endTime: makeTime(10, 45),
    resourceId: '2',
    clientName: 'Diana Prince',
  },
  {
    id: '5',
    title: 'Lab Review',
    startTime: makeTime(13, 0),
    endTime: makeTime(13, 30),
    resourceId: '2',
    clientName: 'Eve Martinez',
  },

  // Resource 3: 3-event overlap
  {
    id: '6',
    title: 'New Patient',
    startTime: makeTime(11, 0),
    endTime: makeTime(12, 0),
    resourceId: '3',
  },
  {
    id: '7',
    title: 'Emergency Visit',
    startTime: makeTime(11, 15),
    endTime: makeTime(11, 45),
    resourceId: '3',
    color: '#dc2626',
  },
  {
    id: '8',
    title: 'Phone Consult',
    startTime: makeTime(11, 30),
    endTime: makeTime(12, 15),
    resourceId: '3',
  },

  // Resource 4: long event
  {
    id: '9',
    title: 'Surgery',
    startTime: makeTime(8, 0),
    endTime: makeTime(11, 30),
    resourceId: '4',
    clientName: 'Frank Wilson',
  },
  {
    id: '10',
    title: 'Post-Op Check',
    startTime: makeTime(15, 0),
    endTime: makeTime(15, 30),
    resourceId: '4',
  },

  // Resource 5: scattered events
  {
    id: '11',
    title: 'Morning Rounds',
    startTime: makeTime(7, 30),
    endTime: makeTime(8, 30),
    resourceId: '5',
  },
  {
    id: '12',
    title: 'Team Meeting',
    startTime: makeTime(12, 0),
    endTime: makeTime(13, 0),
    resourceId: '5',
    color: '#6366f1',
  },
  {
    id: '13',
    title: 'Patient Intake',
    clientName: 'Bob Williams',
    startTime: makeTime(14, 30),
    endTime: makeTime(15, 15),
    resourceId: '5',
  },
  {
    id: '14',
    title: 'Chart Review',
    startTime: makeTime(16, 0),
    endTime: makeTime(16, 30),
    resourceId: '5',
  },
  {
    id: '15',
    title: 'Quick Check',
    startTime: makeTime(9, 0),
    endTime: makeTime(9, 15),
    resourceId: '2',
    clientName: 'Grace Lee',
  },

  // Cross-midnight event (11pm today → 1am tomorrow)
  {
    id: '19',
    title: 'Late Night On-Call',
    startTime: makeTime(23, 0),
    endTime: makeTomorrowTime(1, 0),
    resourceId: '5',
    color: '#7c3aed',
  },

  // All-day events
  {
    id: '16',
    title: 'Conference',
    startDate: today,
    endDate: today,
    resourceId: '1',
    allDay: true,
    color: '#3b82f6',
  },
  {
    id: '17',
    title: 'PTO',
    startDate: today,
    endDate: today,
    resourceId: '3',
    allDay: true,
    color: '#10b981',
  },
  {
    id: '18',
    title: 'Training Day',
    startDate: today,
    endDate: today,
    resourceId: '1',
    allDay: true,
    color: '#f59e0b',
  },
];

const availability: Record<string, AvailabilityRange[]> = {
  // Dr. Smith: available 9am-12pm and 1pm-5pm (lunch break)
  '1': [
    { startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
    { startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
  ],
  // Dr. Johnson: available 8am-3pm
  '2': [{ startTime: makeTime(8, 0), endTime: makeTime(15, 0) }],
  // Dr. Williams: available 10am-6pm
  '3': [{ startTime: makeTime(10, 0), endTime: makeTime(18, 0) }],
  // Dr. Brown: available 7am-11am and 2pm-5pm
  '4': [
    { startTime: makeTime(7, 0), endTime: makeTime(11, 0) },
    { startTime: makeTime(14, 0), endTime: makeTime(17, 0) },
  ],
  // Dr. Davis: not listed — fully available
};

// Week range for DayGridView demo (Mon-Sun containing today)
const weekStart = today.subtract({ days: today.dayOfWeek - 1 }); // Monday
const weekEnd = weekStart.add({ days: 6 }); // Sunday

function makeDayTime(
  date: Temporal.PlainDate,
  hour: number,
  minute = 0
): Temporal.ZonedDateTime {
  return date.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

const weekEvents: CalendarEvent[] = [
  {
    id: 'w1',
    title: 'Team Standup',
    startTime: makeDayTime(weekStart, 9, 0),
    endTime: makeDayTime(weekStart, 9, 30),
    resourceId: '',
    color: '#3b82f6',
  },
  {
    id: 'w2',
    title: 'Design Review',
    startTime: makeDayTime(weekStart, 14, 0),
    endTime: makeDayTime(weekStart, 15, 0),
    resourceId: '',
    color: '#8b5cf6',
    clientName: 'Design Team',
  },
  {
    id: 'w3',
    title: 'Lunch with Client',
    startTime: makeDayTime(weekStart.add({ days: 1 }), 12, 0),
    endTime: makeDayTime(weekStart.add({ days: 1 }), 13, 0),
    resourceId: '',
    color: '#10b981',
    clientName: 'Jane Cooper',
  },
  {
    id: 'w4',
    title: 'Sprint Planning',
    startTime: makeDayTime(weekStart.add({ days: 1 }), 10, 0),
    endTime: makeDayTime(weekStart.add({ days: 1 }), 11, 30),
    resourceId: '',
    color: '#f59e0b',
  },
  {
    id: 'w5',
    title: '1:1 with Manager',
    startTime: makeDayTime(weekStart.add({ days: 2 }), 15, 0),
    endTime: makeDayTime(weekStart.add({ days: 2 }), 15, 30),
    resourceId: '',
    color: '#ef4444',
  },
  {
    id: 'w6',
    title: 'Workshop',
    startTime: makeDayTime(weekStart.add({ days: 3 }), 9, 0),
    endTime: makeDayTime(weekStart.add({ days: 3 }), 12, 0),
    resourceId: '',
    color: '#6366f1',
  },
  {
    id: 'w7',
    title: 'Coffee Chat',
    startTime: makeDayTime(weekStart.add({ days: 4 }), 10, 0),
    endTime: makeDayTime(weekStart.add({ days: 4 }), 10, 30),
    resourceId: '',
    color: '#ec4899',
    clientName: 'Alex Kim',
  },
  // Overlapping events on Wednesday
  {
    id: 'w8',
    title: 'Code Review',
    startTime: makeDayTime(weekStart.add({ days: 2 }), 10, 0),
    endTime: makeDayTime(weekStart.add({ days: 2 }), 11, 0),
    resourceId: '',
    color: '#14b8a6',
  },
  {
    id: 'w9',
    title: 'Architecture Discussion',
    startTime: makeDayTime(weekStart.add({ days: 2 }), 10, 30),
    endTime: makeDayTime(weekStart.add({ days: 2 }), 11, 30),
    resourceId: '',
    color: '#f97316',
  },
  // Cross-midnight event (11pm Wednesday → 1am Thursday)
  {
    id: 'w14',
    title: 'Late Deployment',
    startTime: makeDayTime(weekStart.add({ days: 2 }), 23, 0),
    endTime: makeDayTime(weekStart.add({ days: 3 }), 1, 0),
    resourceId: '',
    color: '#7c3aed',
  },
  // All-day events
  {
    id: 'w10',
    title: 'Company Offsite',
    startDate: weekStart.add({ days: 4 }),
    endDate: weekStart.add({ days: 4 }),
    resourceId: '',
    allDay: true,
    color: '#7c3aed',
  },
  // Multi-day spanning event (Tue–Thu)
  {
    id: 'w11',
    title: 'Team Summit',
    startDate: weekStart.add({ days: 1 }),
    endDate: weekStart.add({ days: 3 }),
    resourceId: '',
    allDay: true,
    color: '#3b82f6',
  },
  // Event that starts before the visible range (continues-before)
  {
    id: 'w12',
    title: 'Company Retreat',
    startDate: weekStart.subtract({ days: 2 }),
    endDate: weekStart.add({ days: 1 }),
    resourceId: '',
    allDay: true,
    color: '#10b981',
  },
  // Single-day all-day event overlapping multi-day (tests lane stacking)
  {
    id: 'w13',
    title: 'Deadline',
    startDate: weekStart.add({ days: 2 }),
    endDate: weekStart.add({ days: 2 }),
    resourceId: '',
    allDay: true,
    color: '#ef4444',
  },
];

const unavailability: Record<string, AvailabilityRange[]> = {
  // Dr. Johnson: blocked for staff meeting 12pm-1pm (on top of availability window)
  '2': [{ startTime: makeTime(12, 0), endTime: makeTime(13, 0) }],
  // Dr. Davis: out for lunch 12pm-1pm (no availability set, only unavailability)
  '5': [{ startTime: makeTime(12, 0), endTime: makeTime(13, 0) }],
};

function App() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>('demo');
  const [eventLayout, setEventLayout] = useState<EventLayout>('columns');
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(
    null
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [dayGridSelectedRange, setDayGridSelectedRange] =
    useState<DayGridSelectedRange | null>(null);

  const {
    context: selectionContext,
    refs: { setReference: setSelectionRef, setFloating: setSelectionFloating },
    floatingStyles: selectionFloatingStyles,
  } = useFloating({
    open: selectedRange !== null,
    onOpenChange: (open) => {
      if (!open) setSelectedRange(null);
    },
    middleware: [
      flip({ crossAxis: true }),
      shift({ crossAxis: true, limiter: limitShift({ offset: 0 }) }),
      offset(5),
      size({
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${availableHeight}px`;
        },
      }),
    ],
    placement: 'right',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const selectionDismiss = useDismiss(selectionContext);
  const { getFloatingProps: getSelectionFloatingProps } = useInteractions([
    selectionDismiss,
  ]);

  const { isMounted: isSelectionMounted, styles: selectionTransitionStyles } =
    useTransitionStyles(selectionContext, {
      common: {
        transitionProperty: 'all',
      },
      duration: {
        close: 100,
        open: 200,
      },
      initial: ({ side }) => ({
        opacity: 0,
        translate: side === 'left' ? '48px' : '-48px',
      }),
      open: {
        opacity: 1,
      },
    });

  const {
    context: eventContext,
    refs: { setReference: setEventRef, setFloating: setEventFloating },
    floatingStyles: eventFloatingStyles,
  } = useFloating({
    open: selectedEventId !== null,
    onOpenChange: (open) => {
      if (!open) setSelectedEventId(null);
    },
    middleware: [
      flip({ crossAxis: true }),
      shift({ crossAxis: true, limiter: limitShift({ offset: 0 }) }),
      offset(5),
      size({
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${availableHeight}px`;
        },
      }),
    ],
    placement: 'right',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const eventDismiss = useDismiss(eventContext);
  const { getFloatingProps: getEventFloatingProps } = useInteractions([
    eventDismiss,
  ]);

  const { isMounted: isEventMounted, styles: eventTransitionStyles } =
    useTransitionStyles(eventContext, {
      common: {
        transitionProperty: 'all',
      },
      duration: {
        close: 100,
        open: 200,
      },
      initial: ({ side }) => ({
        opacity: 0,
        translate: side === 'left' ? '48px' : '-48px',
      }),
      open: {
        opacity: 1,
      },
    });

  return (
    <div
      className={`antialiased min-h-screen bg-white dark:bg-zinc-950 p-8${dark ? ' dark' : ''}`}
    >
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-zinc-950 dark:text-zinc-50 text-2xl font-bold">
          Calendar Playground
        </h1>
        <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
          {(
            [
              ['demo', 'Demo'],
              ['stress-test', 'Stress Test'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                page === key
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
          {(
            [
              ['columns', 'Columns'],
              ['stacked', 'Stacked'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setEventLayout(key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                eventLayout === key
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1 text-sm text-zinc-950 dark:text-zinc-50 hover:opacity-80"
        >
          {dark ? '☀️ Switch to light' : '🌙 Switch to dark'}
        </button>
      </div>

      {page === 'demo' ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-zinc-950 dark:text-zinc-50 mb-4 text-xl font-semibold">
              Resource Grid View
            </h2>
            <div className="h-200">
              <ResourceGridView
                date={today}
                timeZone={tz}
                columnMinWidth={300}
                resources={resources}
                events={events}
                availability={availability}
                unavailability={unavailability}
                hourHeight={100}
                timeAxis={{ startHour: 7, endHour: 24, intervalMinutes: 15 }}
                snapDuration={15}
                placeholderDuration={30}
                eventLayout={eventLayout}
                onEventClick={(event) => {
                  setSelectedEventId(event.id);
                  setSelectedRange(null);
                }}
                selectedRange={selectedRange}
                selectionRef={setSelectionRef}
                selectedEventId={selectedEventId}
                selectedEventRef={setEventRef}
                onSelect={(range) => {
                  setSelectedRange(range);
                  setSelectedEventId(null);
                  console.log('Selection:', range);
                }}
                onSlotClick={(info) => console.log('Slot clicked:', info)}
                selectionAppearance={{
                  style: 'event',
                  eventData: {
                    title: 'New appointment',
                    color: '#3b82f6',
                  },
                }}
                renderCorner={() => (
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-2 py-1">
                    {
                      new Intl.DateTimeFormat('en-US', {
                        timeZone: tz,
                        timeZoneName: 'short',
                      })
                        .formatToParts(new Date())
                        .find((p) => p.type === 'timeZoneName')?.value
                    }
                  </span>
                )}
                className="h-full"
              />
              {isSelectionMounted && (
                <div
                  ref={setSelectionFloating}
                  style={{
                    ...selectionFloatingStyles,
                    ...selectionTransitionStyles,
                  }}
                  {...getSelectionFloatingProps()}
                  className="z-50 rounded-lg ring ring-zinc-900/10 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    What would you like to do?
                  </p>
                  <button
                    className="mt-4 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={() => {
                      console.log('Create event:', selectedRange);
                    }}
                  >
                    Create event
                  </button>
                </div>
              )}
              {isEventMounted && (
                <div
                  ref={setEventFloating}
                  style={{
                    ...eventFloatingStyles,
                    ...eventTransitionStyles,
                  }}
                  {...getEventFloatingProps()}
                  className="z-50 rounded-lg ring ring-zinc-900/10 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    Event selected
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {events.find((e) => e.id === selectedEventId)?.title}
                  </p>
                  <button
                    className="mt-4 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={() => {
                      console.log('Edit event:', selectedEventId);
                    }}
                  >
                    Edit event
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-zinc-950 dark:text-zinc-50 mb-4 text-xl font-semibold">
              Day Grid View (Week)
            </h2>
            <div className="h-200">
              <DayGridView
                activeRange={{ startDate: weekStart, endDate: weekEnd }}
                timeZone={tz}
                events={weekEvents}
                hourHeight={100}
                timeAxis={{ startHour: 0, endHour: 24, intervalMinutes: 15 }}
                snapDuration={15}
                placeholderDuration={30}
                eventLayout={eventLayout}
                onEventClick={(event) => {
                  console.log('Day grid event clicked:', event);
                }}
                selectedRange={dayGridSelectedRange}
                onSelect={(range) => {
                  setDayGridSelectedRange(range);
                  console.log('Day grid selection:', range);
                }}
                onSlotClick={(info) =>
                  console.log('Day grid slot clicked:', info)
                }
                selectionAppearance={{
                  style: 'event',
                  eventData: {
                    title: 'New event',
                    color: '#3b82f6',
                  },
                }}
                renderCorner={() => (
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-2 py-1">
                    {
                      new Intl.DateTimeFormat('en-US', {
                        timeZone: tz,
                        timeZoneName: 'short',
                      })
                        .formatToParts(new Date())
                        .find((p) => p.type === 'timeZoneName')?.value
                    }
                  </span>
                )}
                className="h-full"
              />
            </div>
          </section>
        </div>
      ) : (
        <StressTestPage eventLayout={eventLayout} />
      )}
    </div>
  );
}

export default App;
