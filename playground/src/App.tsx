import {
  ResourceGridView,
  WeekView,
  type CalendarResource,
  type CalendarEvent,
} from '@savvycal/calendar';

const resources: CalendarResource[] = [
  { id: '1', name: 'Dr. Smith', color: '#3b82f6' },
  { id: '2', name: 'Dr. Johnson', color: '#8b5cf6' },
  { id: '3', name: 'Dr. Williams', color: '#10b981' },
];

const events: CalendarEvent[] = [
  {
    id: '1',
    title: 'Annual Checkup',
    startTime: '2025-01-15T09:00:00',
    endTime: '2025-01-15T09:30:00',
    resourceId: '1',
  },
  {
    id: '2',
    title: 'Consultation',
    startTime: '2025-01-15T10:00:00',
    endTime: '2025-01-15T10:45:00',
    resourceId: '2',
  },
  {
    id: '3',
    title: 'Follow-up',
    startTime: '2025-01-15T14:00:00',
    endTime: '2025-01-15T14:30:00',
    resourceId: '1',
  },
  {
    id: '4',
    title: 'New Patient',
    startTime: '2025-01-15T11:00:00',
    endTime: '2025-01-15T12:00:00',
    resourceId: '3',
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
          <ResourceGridView
            date="2025-01-15"
            timeZone="America/New_York"
            resources={resources}
            events={events}
            onEventClick={(event) => console.log('Clicked:', event)}
          />
        </section>

        <section>
          <h2 className="text-cal-foreground mb-4 text-xl font-semibold">
            Week View
          </h2>
          <WeekView
            date="2025-01-15"
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
