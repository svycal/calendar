import { Temporal } from 'temporal-polyfill';

export interface ClippedSpan {
  /** 0-based first column */
  startCol: number;
  /** Number of columns covered */
  span: number;
  /** Starts before the first date */
  continuesBefore: boolean;
  /** Ends after the last date */
  continuesAfter: boolean;
}

/**
 * Clips an inclusive date range to a run of consecutive dates, or returns
 * null when it doesn't overlap them.
 */
export function clipDateSpan(
  startDate: Temporal.PlainDate,
  endDate: Temporal.PlainDate,
  dates: Temporal.PlainDate[]
): ClippedSpan | null {
  if (dates.length === 0) return null;
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];
  if (
    Temporal.PlainDate.compare(startDate, rangeEnd) > 0 ||
    Temporal.PlainDate.compare(endDate, rangeStart) < 0
  ) {
    return null;
  }

  const continuesBefore = Temporal.PlainDate.compare(startDate, rangeStart) < 0;
  const continuesAfter = Temporal.PlainDate.compare(endDate, rangeEnd) > 0;
  const startCol = continuesBefore
    ? 0
    : startDate.since(rangeStart, { largestUnit: 'days' }).days;
  const endCol = continuesAfter
    ? dates.length - 1
    : endDate.since(rangeStart, { largestUnit: 'days' }).days;

  return {
    startCol,
    span: endCol - startCol + 1,
    continuesBefore,
    continuesAfter,
  };
}

/**
 * Greedily gives each item, in order, the first lane that's free across
 * every column it covers. Returns the lane for each item.
 */
export function assignLanes(
  items: { startCol: number; span: number }[],
  columnCount: number
): number[] {
  const lanes: boolean[][] = [];
  return items.map(({ startCol, span }) => {
    const endCol = startCol + span - 1;
    let lane = lanes.findIndex((occupied) => {
      for (let c = startCol; c <= endCol; c++) {
        if (occupied[c]) return false;
      }
      return true;
    });
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(new Array(columnCount).fill(false));
    }
    for (let c = startCol; c <= endCol; c++) lanes[lane][c] = true;
    return lane;
  });
}
