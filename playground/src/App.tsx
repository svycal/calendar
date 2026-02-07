import {
  ResourceGridView,
  WeekView,
  type CalendarResource,
  type CalendarEvent,
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
  },
  {
    id: '2',
    title: 'Walk-in Patient',
    startTime: `${today}T09:15:00`,
    endTime: `${today}T09:45:00`,
    resourceId: '1',
  },
  {
    id: '3',
    title: 'Follow-up',
    startTime: `${today}T14:00:00`,
    endTime: `${today}T14:30:00`,
    resourceId: '1',
  },

  // Resource 2: non-overlapping events
  {
    id: '4',
    title: 'Consultation',
    startTime: `${today}T10:00:00`,
    endTime: `${today}T10:45:00`,
    resourceId: '2',
  },
  {
    id: '5',
    title: 'Lab Review',
    startTime: `${today}T13:00:00`,
    endTime: `${today}T13:30:00`,
    resourceId: '2',
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
  },
];

function App() {
  return (
    <div className="min-h-screen bg-cal-background p-8">
      <h1 className="text-cal-foreground mb-8 text-2xl font-bold">
        Calendar Playground
      </h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-cal-foreground mb-4 text-xl font-semibold">
            Resource Grid View
          </h2>
          <div className="h-[600px]">
            <ResourceGridView
              date={today}
              timeZone="America/New_York"
              resources={resources}
              events={events}
              timeAxis={{ startHour: 7, endHour: 18 }}
              slotDuration={15}
              onEventClick={(event) => console.log('Clicked:', event)}
              onSlotClick={(info) => console.log('Slot clicked:', info)}
              className="h-full"
            />
          </div>
        </section>

        <section>
          <h2 className="text-cal-foreground mb-4 text-xl font-semibold">
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
