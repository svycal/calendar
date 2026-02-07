import { memo } from 'react';
import type { ReactNode } from 'react';
import type {
  CalendarResource,
  ResourceGridViewClassNames,
} from '@/types/calendar';

interface GridHeaderProps {
  resource: CalendarResource;
  column: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  renderHeader?: (props: { resource: CalendarResource }) => ReactNode;
}

export const GridHeader = memo(function GridHeader({
  resource,
  column,
  cls,
  renderHeader,
}: GridHeaderProps) {
  return (
    <div
      className={cls('headerCell')}
      style={{ gridRow: 1, gridColumn: column }}
    >
      {renderHeader ? (
        renderHeader({ resource })
      ) : (
        <>
          {resource.avatarUrl && (
            <img
              src={resource.avatarUrl}
              alt=""
              className={cls('headerAvatar')}
            />
          )}
          <span className={cls('headerName')}>{resource.name}</span>
        </>
      )}
    </div>
  );
});
