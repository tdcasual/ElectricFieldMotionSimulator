function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type DemoSession<T = unknown> = {
  exit: () => T;
};

export function createDemoSession<T>(snapshot: T): DemoSession<T> {
  const frozen = cloneDeep(snapshot);
  return {
    exit: () => cloneDeep(frozen)
  };
}
