// jsdom doesn't implement ResizeObserver, which useEffectiveHourHeight relies on.
// Provide a no-op stub so components can mount in tests.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
}

// Opt in to React's act() testing environment so layout effects flush
// synchronously during render and React doesn't warn.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
