import { useState } from 'react';
import {
  ResourceGridView,
  WeekView,
  type CalendarResource,
  type CalendarEvent,
  type AvailabilityRange,
} from '@savvycal/calendar';

// Use today's date so the now indicator renders
const today = new Date().toISOString().split('T')[0];

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
    startTime: `${today}T09:00:00`,
    endTime: `${today}T09:45:00`,
    resourceId: '1',
    clientName: 'Alice Thompson',
  },
  {
    id: '2',
    title: 'Walk-in Patient',
    startTime: `${today}T09:15:00`,
    endTime: `${today}T09:45:00`,
    resourceId: '1',
    clientName: 'Bob Barker',
    status: 'canceled',
  },
  {
    id: '3',
    title: 'Follow-up',
    startTime: `${today}T14:00:00`,
    endTime: `${today}T14:30:00`,
    resourceId: '1',
    clientName: 'Charlie Davis',
  },

  // Resource 2: non-overlapping events
  {
    id: '4',
    title: 'Consultation',
    startTime: `${today}T10:00:00`,
    endTime: `${today}T10:45:00`,
    resourceId: '2',
    clientName: 'Diana Prince',
  },
  {
    id: '5',
    title: 'Lab Review',
    startTime: `${today}T13:00:00`,
    endTime: `${today}T13:30:00`,
    resourceId: '2',
    clientName: 'Eve Martinez',
  },

  // Resource 3: 3-event overlap
  {
    id: '6',
    title: 'New Patient',
    startTime: `${today}T11:00:00`,
    endTime: `${today}T12:00:00`,
    resourceId: '3',
  },
  {
    id: '7',
    title: 'Emergency Visit',
    startTime: `${today}T11:15:00`,
    endTime: `${today}T11:45:00`,
    resourceId: '3',
    color: '#dc2626',
  },
  {
    id: '8',
    title: 'Phone Consult',
    startTime: `${today}T11:30:00`,
    endTime: `${today}T12:15:00`,
    resourceId: '3',
  },

  // Resource 4: long event
  {
    id: '9',
    title: 'Surgery',
    startTime: `${today}T08:00:00`,
    endTime: `${today}T11:30:00`,
    resourceId: '4',
    clientName: 'Frank Wilson',
  },
  {
    id: '10',
    title: 'Post-Op Check',
    startTime: `${today}T15:00:00`,
    endTime: `${today}T15:30:00`,
    resourceId: '4',
  },

  // Resource 5: scattered events
  {
    id: '11',
    title: 'Morning Rounds',
    startTime: `${today}T07:30:00`,
    endTime: `${today}T08:30:00`,
    resourceId: '5',
  },
  {
    id: '12',
    title: 'Team Meeting',
    startTime: `${today}T12:00:00`,
    endTime: `${today}T13:00:00`,
    resourceId: '5',
    color: '#6366f1',
  },
  {
    id: '13',
    title: 'Patient Intake',
    clientName: 'Bob Williams',
    startTime: `${today}T14:30:00`,
    endTime: `${today}T15:15:00`,
    resourceId: '5',
  },
  {
    id: '14',
    title: 'Chart Review',
    startTime: `${today}T16:00:00`,
    endTime: `${today}T16:30:00`,
    resourceId: '5',
  },
  {
    id: '15',
    title: 'Quick Check',
    startTime: `${today}T09:00:00`,
    endTime: `${today}T09:15:00`,
    resourceId: '2',
    clientName: 'Grace Lee',
  },
];

const availability: Record<string, AvailabilityRange[]> = {
  // Dr. Smith: available 9am-12pm and 1pm-5pm (lunch break)
  '1': [
    { startTime: `${today}T09:00:00`, endTime: `${today}T12:00:00` },
    { startTime: `${today}T13:00:00`, endTime: `${today}T17:00:00` },
  ],
  // Dr. Johnson: available 8am-3pm
  '2': [{ startTime: `${today}T08:00:00`, endTime: `${today}T15:00:00` }],
  // Dr. Williams: available 10am-6pm
  '3': [{ startTime: `${today}T10:00:00`, endTime: `${today}T18:00:00` }],
  // Dr. Brown: available 7am-11am and 2pm-5pm
  '4': [
    { startTime: `${today}T07:00:00`, endTime: `${today}T11:00:00` },
    { startTime: `${today}T14:00:00`, endTime: `${today}T17:00:00` },
  ],
  // Dr. Davis: not listed — fully available
};

const unavailability: Record<string, AvailabilityRange[]> = {
  // Dr. Johnson: blocked for staff meeting 12pm-1pm (on top of availability window)
  '2': [{ startTime: `${today}T12:00:00`, endTime: `${today}T13:00:00` }],
  // Dr. Davis: out for lunch 12pm-1pm (no availability set, only unavailability)
  '5': [{ startTime: `${today}T12:00:00`, endTime: `${today}T13:00:00` }],
};

function App() {
  const [dark, setDark] = useState(false);

  return (
    <div
      className={`min-h-screen bg-white dark:bg-gray-950 p-8${dark ? ' dark' : ''}`}
    >
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-gray-950 dark:text-gray-50 text-2xl font-bold">
          Calendar Playground
        </h1>
        <button
          onClick={() => setDark(!dark)}
          className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1 text-sm text-gray-950 dark:text-gray-50 hover:opacity-80"
        >
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-gray-950 dark:text-gray-50 mb-4 text-xl font-semibold">
            Resource Grid View
          </h2>
          <div className="h-[600px]">
            <ResourceGridView
              date={today}
              timeZone="America/New_York"
              resources={resources}
              events={events}
              availability={availability}
              unavailability={unavailability}
              hourHeight={100}
              timeAxis={{ startHour: 7, endHour: 18, intervalMinutes: 15 }}
              slotDuration={15}
              onEventClick={(event) => console.log('Clicked:', event)}
              onSlotClick={(info) => console.log('Slot clicked:', info)}
              className="h-full"
            />
          </div>
        </section>

        <section>
          <h2 className="text-gray-950 dark:text-gray-50 mb-4 text-xl font-semibold">
            Week View
          </h2>
          <WeekView
            date={today}
            timeZone="America/New_York"
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
