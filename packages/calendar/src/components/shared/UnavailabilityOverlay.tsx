import { memo } from 'react';
import type { GridViewClassNames } from '@/types/calendar';
import type { UnavailableBlock } from '@/lib/availability';

interface UnavailabilityOverlayProps {
  blocks: UnavailableBlock[];
  column: number;
  cls: (key: keyof GridViewClassNames) => string;
}

export const UnavailabilityOverlay = memo(function UnavailabilityOverlay({
  blocks,
  column,
  cls,
}: UnavailabilityOverlayProps) {
  if (blocks.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'none',
        // One compositor layer for the row-spanning grid item. Safari
        // otherwise fragments that item and paints semi-transparent
        // backgrounds once per row.
        isolation: 'isolate',
        transform: 'translateZ(0)',
        overflow: 'hidden',
      }}
    >
      {blocks.map((block, i) => (
        <div
          key={i}
          className={cls('unavailableOverlay')}
          style={{
            position: 'absolute',
            top: block.top,
            left: 0,
            right: 0,
            height: block.height,
            backgroundPosition: `0 ${-Math.round(block.top)}px`,
          }}
        />
      ))}
    </div>
  );
});
