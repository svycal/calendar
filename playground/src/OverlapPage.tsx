import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  ResourceGridView,
  DayGridView,
  type CalendarResource,
  type CalendarEvent,
  type EventLayout,
} from '@savvycal/calendar';

const tz = 'America/Chicago';
const today = Temporal.Now.plainDateISO(tz);

function makeTime(hour: number, minute = 0): Temporal.ZonedDateTime {
  return today.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

function makeDayTime(
  date: Temporal.PlainDate,
  hour: number,
  minute = 0
): Temporal.ZonedDateTime {
  return date.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

const CAL = {
  google: '#14b8a6',
  outlook: '#3b82f6',
  savvy: '#8b5cf6',
  block: '#ef4444',
};

const resources: CalendarResource[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    color: CAL.savvy,
    avatarUrl: 'https://i.pravatar.cc/48?u=maya-chen',
  },
];

const events: CalendarEvent[] = [
  // Three long morning blocks — the connected-group problem
  {
    id: 'j-deep-work',
    title: 'Deep work',
    startTime: makeTime(7, 0),
    endTime: makeTime(16, 0),
    resourceId: 'maya',
    color: CAL.google,
  },
  {
    id: 'j-onsite',
    title: 'On-site with Acme',
    startTime: makeTime(7, 0),
    endTime: makeTime(16, 30),
    resourceId: 'maya',
    color: CAL.outlook,
  },
  {
    id: 'j-conference',
    title: 'Industry conference (virtual)',
    startTime: makeTime(7, 0),
    endTime: makeTime(17, 0),
    resourceId: 'maya',
    color: CAL.google,
  },

  // 10:30 cluster
  {
    id: 'j-product-sync',
    title: 'Product sync',
    startTime: makeTime(10, 30),
    endTime: makeTime(12, 0),
    resourceId: 'maya',
    color: CAL.outlook,
  },
  {
    id: 'j-design-critique',
    title: 'Design critique',
    startTime: makeTime(10, 30),
    endTime: makeTime(12, 30),
    resourceId: 'maya',
    color: CAL.google,
  },

  // Holds + SavvyCal bookings through the middle of the day
  {
    id: 'j-focus-block',
    title: 'Focus block',
    startTime: makeTime(11, 30),
    endTime: makeTime(12, 0),
    resourceId: 'maya',
    color: CAL.block,
  },
  {
    id: 'j-intro-priya',
    title: 'Intro call',
    clientName: 'Priya Shah',
    startTime: makeTime(12, 0),
    endTime: makeTime(12, 30),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'j-demo-marcus',
    title: 'Product demo',
    clientName: 'Marcus Lee',
    startTime: makeTime(12, 30),
    endTime: makeTime(13, 0),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'j-lunch',
    title: 'Lunch',
    startTime: makeTime(13, 30),
    endTime: makeTime(14, 0),
    resourceId: 'maya',
    color: CAL.block,
  },
  {
    id: 'j-onboarding',
    title: 'Onboarding',
    clientName: 'Riley Chen',
    startTime: makeTime(14, 0),
    endTime: makeTime(14, 30),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'j-followup',
    title: 'Follow-up',
    clientName: 'Dana Ortiz',
    startTime: makeTime(14, 30),
    endTime: makeTime(15, 0),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'j-consult',
    title: 'Consultation',
    clientName: 'Sam Patel',
    startTime: makeTime(15, 0),
    endTime: makeTime(15, 30),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'j-hold',
    title: 'Hold',
    startTime: makeTime(15, 30),
    endTime: makeTime(16, 0),
    resourceId: 'maya',
    color: CAL.block,
  },

  // 4pm cluster
  {
    id: 'j-standup',
    title: 'Team standup',
    startTime: makeTime(16, 0),
    endTime: makeTime(16, 30),
    resourceId: 'maya',
    color: CAL.outlook,
  },
  {
    id: 'j-1on1',
    title: '1:1 with Derrick',
    startTime: makeTime(16, 0),
    endTime: makeTime(16, 45),
    resourceId: 'maya',
    color: CAL.google,
  },
  {
    id: 'j-interview',
    title: 'Customer interview',
    startTime: makeTime(16, 0),
    endTime: makeTime(17, 0),
    resourceId: 'maya',
    color: CAL.outlook,
  },
  {
    id: 'j-wrap',
    title: 'Wrap-up',
    clientName: 'Jordan Blake',
    startTime: makeTime(16, 30),
    endTime: makeTime(17, 0),
    resourceId: 'maya',
    color: CAL.savvy,
    priority: 1,
  },

  // 6:30 cluster
  {
    id: 'j-gym',
    title: 'Gym',
    startTime: makeTime(18, 30),
    endTime: makeTime(19, 30),
    resourceId: 'maya',
    color: CAL.google,
  },
  {
    id: 'j-dinner',
    title: 'Dinner reservation',
    startTime: makeTime(18, 30),
    endTime: makeTime(20, 0),
    resourceId: 'maya',
    color: CAL.outlook,
  },
];

const weekStart = today.subtract({ days: today.dayOfWeek - 1 });
const weekEnd = weekStart.add({ days: 6 });
const wednesday = weekStart.add({ days: 2 });

const weekEvents: CalendarEvent[] = [
  {
    id: 'w-deep-work',
    title: 'Deep work',
    startTime: makeDayTime(wednesday, 7, 0),
    endTime: makeDayTime(wednesday, 16, 0),
    resourceId: '',
    color: CAL.google,
  },
  {
    id: 'w-onsite',
    title: 'On-site with Acme',
    startTime: makeDayTime(wednesday, 7, 0),
    endTime: makeDayTime(wednesday, 16, 30),
    resourceId: '',
    color: CAL.outlook,
  },
  {
    id: 'w-conference',
    title: 'Industry conference (virtual)',
    startTime: makeDayTime(wednesday, 7, 0),
    endTime: makeDayTime(wednesday, 17, 0),
    resourceId: '',
    color: CAL.google,
  },
  {
    id: 'w-product-sync',
    title: 'Product sync',
    startTime: makeDayTime(wednesday, 10, 30),
    endTime: makeDayTime(wednesday, 12, 0),
    resourceId: '',
    color: CAL.outlook,
  },
  {
    id: 'w-design-critique',
    title: 'Design critique',
    startTime: makeDayTime(wednesday, 10, 30),
    endTime: makeDayTime(wednesday, 12, 30),
    resourceId: '',
    color: CAL.google,
  },
  {
    id: 'w-intro',
    title: 'Intro call',
    clientName: 'Priya Shah',
    startTime: makeDayTime(wednesday, 12, 0),
    endTime: makeDayTime(wednesday, 12, 30),
    resourceId: '',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'w-demo',
    title: 'Product demo',
    clientName: 'Marcus Lee',
    startTime: makeDayTime(wednesday, 12, 30),
    endTime: makeDayTime(wednesday, 13, 0),
    resourceId: '',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'w-lunch',
    title: 'Lunch',
    startTime: makeDayTime(wednesday, 13, 30),
    endTime: makeDayTime(wednesday, 14, 0),
    resourceId: '',
    color: CAL.block,
  },
  {
    id: 'w-consult',
    title: 'Consultation',
    clientName: 'Sam Patel',
    startTime: makeDayTime(wednesday, 15, 0),
    endTime: makeDayTime(wednesday, 15, 30),
    resourceId: '',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'w-standup',
    title: 'Team standup',
    startTime: makeDayTime(wednesday, 16, 0),
    endTime: makeDayTime(wednesday, 16, 30),
    resourceId: '',
    color: CAL.outlook,
  },
  {
    id: 'w-1on1',
    title: '1:1 with Derrick',
    startTime: makeDayTime(wednesday, 16, 0),
    endTime: makeDayTime(wednesday, 16, 45),
    resourceId: '',
    color: CAL.google,
  },
  {
    id: 'w-interview',
    title: 'Customer interview',
    startTime: makeDayTime(wednesday, 16, 0),
    endTime: makeDayTime(wednesday, 17, 0),
    resourceId: '',
    color: CAL.outlook,
  },
  {
    id: 'w-mon-planning',
    title: 'Sprint planning',
    startTime: makeDayTime(weekStart, 10, 0),
    endTime: makeDayTime(weekStart, 11, 30),
    resourceId: '',
    color: CAL.savvy,
    priority: 1,
  },
  {
    id: 'w-fri-retro',
    title: 'Retro',
    startTime: makeDayTime(weekStart.add({ days: 4 }), 15, 0),
    endTime: makeDayTime(weekStart.add({ days: 4 }), 16, 0),
    resourceId: '',
    color: CAL.outlook,
  },
];

interface OverlapPageProps {
  eventLayout: EventLayout;
}

export default function OverlapPage({ eventLayout }: OverlapPageProps) {
  const [columnWidth, setColumnWidth] = useState(260);
  const [eventMinWidth, setEventMinWidth] = useState(80);
  const [maxStack, setMaxStack] = useState<number | 0>(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const eventMaxStack = maxStack === 0 ? undefined : maxStack;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-end gap-6">
          <div>
            <h2 className="text-zinc-950 dark:text-zinc-50 text-xl font-semibold">
              Staggered overlaps
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Maya&apos;s day mirrors a busy connected-calendar feed: long
              blocks, staggered mid-morning meetings, and short SavvyCal
              bookings. Product appointments use a higher <code>priority</code>,
              so they stay on the grid when the stack is capped. Click{' '}
              <span className="font-medium">+N</span> for the rest.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Column width ({columnWidth}px)
            <input
              type="range"
              min={160}
              max={480}
              step={10}
              value={columnWidth}
              onChange={(e) => setColumnWidth(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Event min width ({eventMinWidth}px)
            <input
              type="range"
              min={0}
              max={160}
              step={10}
              value={eventMinWidth}
              onChange={(e) => setEventMinWidth(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Max stack
            <select
              value={maxStack}
              onChange={(e) => setMaxStack(Number(e.target.value) as 0)}
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value={0}>Width only</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        </div>
        <div className="h-200" style={{ maxWidth: columnWidth + 72 }}>
          <ResourceGridView
            date={today}
            timeZone={tz}
            columnMinWidth={columnWidth}
            resources={resources}
            events={events}
            hourHeight={80}
            timeAxis={{ startHour: 7, endHour: 21, intervalMinutes: 30 }}
            initialScrollHour={7}
            eventLayout={eventLayout}
            eventMinWidth={eventMinWidth}
            eventMaxStack={eventMaxStack}
            selectedEventId={selectedEventId}
            onEventClick={(event) => setSelectedEventId(event.id)}
            className="h-full"
          />
        </div>
      </section>

      <section>
        <h2 className="text-zinc-950 dark:text-zinc-50 mb-4 text-xl font-semibold">
          Week view (dense Wednesday)
        </h2>
        <div className="h-200">
          <DayGridView
            activeRange={{ startDate: weekStart, endDate: weekEnd }}
            timeZone={tz}
            events={weekEvents}
            hourHeight={72}
            timeAxis={{ startHour: 7, endHour: 20, intervalMinutes: 30 }}
            initialScrollHour={7}
            eventLayout={eventLayout}
            eventMinWidth={eventMinWidth}
            eventMaxStack={eventMaxStack}
            className="h-full"
          />
        </div>
      </section>
    </div>
  );
}
