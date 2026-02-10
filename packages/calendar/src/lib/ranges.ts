import type { AvailabilityRange, SelectedRange } from '@/types/calendar';

/** Decompose a SelectedRange into plain date/time component objects */
export function selectedRangeToComponents(range: SelectedRange) {
  return {
    startDate: {
      year: range.startTime.year,
      month: range.startTime.month,
      day: range.startTime.day,
    },
    startTime: {
      hour: range.startTime.hour,
      minute: range.startTime.minute,
    },
    endDate: {
      year: range.endTime.year,
      month: range.endTime.month,
      day: range.endTime.day,
    },
    endTime: {
      hour: range.endTime.hour,
      minute: range.endTime.minute,
    },
    resourceId: range.resourceId,
  };
}

/** Convert a SelectedRange to ISO string representations */
export function selectedRangeToISO(range: SelectedRange) {
  return {
    startDate: range.startTime.toPlainDate().toString(),
    startTime: range.startTime
      .toPlainTime()
      .toString({ smallestUnit: 'minute' }),
    endDate: range.endTime.toPlainDate().toString(),
    endTime: range.endTime.toPlainTime().toString({ smallestUnit: 'minute' }),
    resourceId: range.resourceId,
  };
}

/** Group items by resource ID into a Record of AvailabilityRange arrays */
export function groupAvailabilityByResource<T>(
  items: T[],
  getResourceId: (item: T) => string,
  getRange: (item: T) => AvailabilityRange
): Record<string, AvailabilityRange[]> {
  const result: Record<string, AvailabilityRange[]> = {};
  for (const item of items) {
    const resourceId = getResourceId(item);
    if (!result[resourceId]) {
      result[resourceId] = [];
    }
    result[resourceId].push(getRange(item));
  }
  return result;
}
