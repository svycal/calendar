import { memo } from 'react';
import type { CalendarResource } from '@/types/calendar';
import {
  TimedEventLayer,
  type TimedEventLayerProps,
} from '../shared/TimedEventLayer';

interface ResourceColumnProps extends Omit<
  TimedEventLayerProps,
  'columnId' | 'fallbackColor'
> {
  resource: CalendarResource;
}

export const ResourceColumn = memo(function ResourceColumn({
  resource,
  ...rest
}: ResourceColumnProps) {
  return (
    <TimedEventLayer
      {...rest}
      columnId={resource.id}
      fallbackColor={resource.color}
    />
  );
});
