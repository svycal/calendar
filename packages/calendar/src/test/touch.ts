import { act } from 'react';

/** A touch point: [clientX, clientY, event time in ms]. */
export type TouchPoint = [number, number, number];

/** Dispatches a one-finger touch event, as the browser sends it. */
export function fireTouch(
  target: Element,
  type: 'touchstart' | 'touchmove' | 'touchend',
  [x, y, time]: TouchPoint
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { identifier: 1, clientX: x, clientY: y };
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' ? [] : [point] },
    changedTouches: { value: [point] },
    timeStamp: { value: time },
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/**
 * Touches down at the first point, moves through the rest, and lifts at the
 * last, at `endTime` when given. A resting finger sends no moves, so a later
 * `endTime` is a pause before lifting. Returns the moves.
 */
export function touchDrag(
  target: Element,
  path: TouchPoint[],
  endTime?: number
) {
  const [start, ...rest] = path;
  fireTouch(target, 'touchstart', start);
  const moves = rest.map((point) => fireTouch(target, 'touchmove', point));
  const [x, y, time] = path[path.length - 1];
  fireTouch(target, 'touchend', [x, y, endTime ?? time]);
  return moves;
}
