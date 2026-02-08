import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  ResourceGridView,
  WeekView,
  type CalendarResource,
  type CalendarEvent,
  type AvailabilityRange,
  type SelectedRange,
} from '@savvycal/calendar';

const tz = 'America/New_York';

// Use today's date so the now indicator renders
const today = Temporal.Now.plainDateISO(tz);

function makeTime(hour: number, minute = 0): Temporal.ZonedDateTime {
  return today.toPlainDateTime({ hour, minute }).toZonedDateTime(tz);
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
    selected: true,
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

const unavailability: Record<string, AvailabilityRange[]> = {
  // Dr. Johnson: blocked for staff meeting 12pm-1pm (on top of availability window)
  '2': [{ startTime: makeTime(12, 0), endTime: makeTime(13, 0) }],
  // Dr. Davis: out for lunch 12pm-1pm (no availability set, only unavailability)
  '5': [{ startTime: makeTime(12, 0), endTime: makeTime(13, 0) }],
};

function App() {
  const [dark, setDark] = useState(false);
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(
    null
  );

  return (
    <div
      className={`antialiased min-h-screen bg-white dark:bg-zinc-950 p-8${dark ? ' dark' : ''}`}
    >
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-zinc-950 dark:text-zinc-50 text-2xl font-bold">
          Calendar Playground
        </h1>
        <button
          onClick={() => setDark(!dark)}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1 text-sm text-zinc-950 dark:text-zinc-50 hover:opacity-80"
        >
          {dark ? '☀️ Switch to light' : '🌙 Switch to dark'}
        </button>
      </div>

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
              timeAxis={{ startHour: 7, endHour: 18, intervalMinutes: 15 }}
              slotDuration={15}
              onEventClick={(event) => console.log('Clicked:', event)}
              selectedRange={selectedRange}
              onSelect={(range) => {
                setSelectedRange(range);
                console.log('Selection:', range);
              }}
              onSlotClick={(info) => console.log('Slot clicked:', info)}
              className="h-full"
            />
          </div>
        </section>

        <section>
          <h2 className="text-zinc-950 dark:text-zinc-50 mb-4 text-xl font-semibold">
            Week View
          </h2>
          <WeekView
            date={today}
            timeZone={tz}
            resource={resources[0]}
            events={events.filter((e) => e.resourceId === '1')}
            onEventClick={(event) => console.log('Clicked:', event)}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
