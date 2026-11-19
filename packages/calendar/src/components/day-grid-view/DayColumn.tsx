import { memo } from 'react';
import {
  TimedEventLayer,
  type TimedEventLayerProps,
} from '../shared/TimedEventLayer';

export const DayColumn = memo(function DayColumn(props: TimedEventLayerProps) {
  return <TimedEventLayer {...props} />;
});
