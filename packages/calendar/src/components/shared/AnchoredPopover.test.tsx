import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnchoredPopover, DISMISS_ONLY_ATTR } from './AnchoredPopover';

const mounts: Array<{ root: Root; container: HTMLElement }> = [];

afterEach(() => {
  while (mounts.length) {
    const { root, container } = mounts.pop()!;
    act(() => root.unmount());
    container.remove();
  }
});

function Harness({
  onSurfaceClick,
  onSurfaceMouseDown,
}: {
  onSurfaceClick: () => void;
  onSurfaceMouseDown: () => void;
}) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} data-testid="trigger">
        +3
      </button>
      <div
        data-testid="surface"
        {...{ [DISMISS_ONLY_ATTR]: '' }}
        onClick={onSurfaceClick}
        onMouseDown={onSurfaceMouseDown}
      />
      <div data-testid="other" />
      {open && (
        <AnchoredPopover
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
          getPosition={() => ({ top: 0, left: 0 })}
          ariaLabel="More events"
        >
          content
        </AnchoredPopover>
      )}
    </>
  );
}

function mount() {
  const onSurfaceClick = vi.fn();
  const onSurfaceMouseDown = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() =>
    root.render(
      <Harness
        onSurfaceClick={onSurfaceClick}
        onSurfaceMouseDown={onSurfaceMouseDown}
      />
    )
  );
  const get = (id: string) =>
    container.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const isOpen = () => !!document.querySelector('[role="dialog"]');
  return { get, isOpen, onSurfaceClick };
}

function press(el: HTMLElement) {
  const down = new MouseEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    el.dispatchEvent(down);
  });
  act(() => {
    el.click();
  });
  return down;
}

describe('AnchoredPopover', () => {
  it('opens with focus inside the dialog', () => {
    const { isOpen } = mount();
    expect(isOpen()).toBe(true);
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');
  });

  it('only dismisses on a press over a dismiss-only surface', () => {
    const { get, isOpen, onSurfaceClick } = mount();
    const down = press(get('surface'));
    expect(isOpen()).toBe(false);
    expect(down.defaultPrevented).toBe(true);
    expect(onSurfaceClick).not.toHaveBeenCalled();

    // Once closed, presses on the surface work normally again
    press(get('surface'));
    expect(onSurfaceClick).toHaveBeenCalledTimes(1);
  });

  it('dismisses on other outside presses without canceling them', () => {
    const { get, isOpen } = mount();
    const down = press(get('other'));
    expect(isOpen()).toBe(false);
    expect(down.defaultPrevented).toBe(false);
  });

  it('stops waiting for a click if the dismiss press never becomes one', () => {
    const { get, onSurfaceClick } = mount();
    act(() => {
      get('surface').dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      );
    });
    // No click followed (e.g. a drag); the next full press goes through
    press(get('surface'));
    expect(onSurfaceClick).toHaveBeenCalledTimes(1);
  });

  it('keeps Escape from reaching other handlers and refocuses the trigger', () => {
    const { get, isOpen } = mount();
    const appHandler = vi.fn();
    document.addEventListener('keydown', appHandler);
    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    document.removeEventListener('keydown', appHandler);
    expect(isOpen()).toBe(false);
    expect(appHandler).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(get('trigger'));
  });
});
