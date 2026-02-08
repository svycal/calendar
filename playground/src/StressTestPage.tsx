import { useMemo } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  ResourceGridView,
  type CalendarResource,
  type CalendarEvent,
  type AvailabilityRange,
} from '@savvycal/calendar';

const tz = 'America/Chicago';
const today = Temporal.Now.plainDateISO(tz);

function makeTime(hour: number, minute = 0): Temporal.ZonedDateTime {
  return today.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
}

// Simple seeded pseudo-random number generator (LCG)
function createRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

const DURATIONS = [15, 30, 30, 45, 45, 60, 60, 90, 120];

const CLIENT_NAMES = [
  'Alice Thompson',
  'Bob Martinez',
  'Charlie Davis',
  'Diana Prince',
  'Eve Wilson',
  'Frank Lee',
  'Grace Kim',
  'Henry Chen',
  'Iris Patel',
  'Jack Murphy',
  'Karen Young',
  'Leo Rivera',
  'Mia Foster',
  'Noah Brooks',
  'Olivia Hayes',
];

const EVENT_TITLES = [
  'Checkup',
  'Consultation',
  'Follow-up',
  'New Patient',
  'Lab Review',
  'Phone Consult',
  'Walk-in',
  'Post-Op Check',
  'Intake',
  'Assessment',
  'Therapy Session',
  'Screening',
];

function generateData() {
  const rng = createRng(42);

  // Generate 20 resources
  const resources: CalendarResource[] = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `Provider ${i + 1}`,
    color: COLORS[i % COLORS.length],
    avatarUrl: `https://i.pravatar.cc/48?u=provider${i + 1}`,
  }));

  const events: CalendarEvent[] = [];
  let eventId = 1;

  for (const resource of resources) {
    const numEvents = 17 + Math.floor(rng() * 8); // 17-24 events per resource

    // Generate timed events
    for (let j = 0; j < numEvents; j++) {
      const startHour = 7 + Math.floor(rng() * 11); // 7am-5pm
      const startMinute = Math.floor(rng() * 4) * 15; // 0, 15, 30, 45
      const duration = DURATIONS[Math.floor(rng() * DURATIONS.length)];

      const endHour = startHour + Math.floor((startMinute + duration) / 60);
      const endMinute = (startMinute + duration) % 60;

      // Skip if event would go past 7pm
      if (endHour > 19) continue;

      const hasClient = rng() > 0.3;
      const title =
        EVENT_TITLES[Math.floor(rng() * EVENT_TITLES.length)];

      events.push({
        id: String(eventId++),
        title,
        startTime: makeTime(startHour, startMinute),
        endTime: makeTime(endHour, endMinute),
        resourceId: resource.id,
        ...(hasClient
          ? {
              clientName:
                CLIENT_NAMES[Math.floor(rng() * CLIENT_NAMES.length)],
            }
          : {}),
      });
    }

    // Add 1-2 all-day events for some resources
    if (rng() > 0.5) {
      events.push({
        id: String(eventId++),
        title: rng() > 0.5 ? 'PTO' : 'Conference',
        startDate: today,
        endDate: today,
        resourceId: resource.id,
        allDay: true,
        color: resource.color,
      });

      if (rng() > 0.7) {
        events.push({
          id: String(eventId++),
          title: 'Training',
          startDate: today,
          endDate: today,
          resourceId: resource.id,
          allDay: true,
          color: COLORS[(COLORS.indexOf(resource.color!) + 3) % COLORS.length],
        });
      }
    }
  }

  // Generate availability for half the resources
  const availability: Record<string, AvailabilityRange[]> = {};
  for (let i = 0; i < 10; i++) {
    const resourceId = String(i + 1);
    availability[resourceId] = [
      { startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
      { startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
    ];
  }

  return { resources, events, availability };
}

export default function StressTestPage() {
  const { resources, events, availability } = useMemo(generateData, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {resources.length} resources, {events.length} events
      </p>
      <div className="h-200">
        <ResourceGridView
          date={today}
          timeZone={tz}
          columnMinWidth={200}
          resources={resources}
          events={events}
          availability={availability}
          hourHeight={100}
          timeAxis={{ startHour: 7, endHour: 24, intervalMinutes: 15 }}
          snapDuration={15}
          onEventClick={(event) => console.log('Clicked:', event)}
          className="h-full"
        />
      </div>
    </div>
  );
}
