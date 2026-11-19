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
 * Clips an inclusive date range to ascending dates, which may skip days, or
 * returns null when it covers none of them.
 */
export function clipDateSpan(
  startDate: Temporal.PlainDate,
  endDate: Temporal.PlainDate,
  dates: Temporal.PlainDate[]
): ClippedSpan | null {
  const startCol = dates.findIndex(
    (d) => Temporal.PlainDate.compare(d, startDate) >= 0
  );
  const endCol =
    dates.filter((d) => Temporal.PlainDate.compare(d, endDate) <= 0).length - 1;
  if (startCol === -1 || startCol > endCol) return null;

  const continuesBefore = Temporal.PlainDate.compare(startDate, dates[0]) < 0;
  const continuesAfter =
    Temporal.PlainDate.compare(endDate, dates[dates.length - 1]) > 0;

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
