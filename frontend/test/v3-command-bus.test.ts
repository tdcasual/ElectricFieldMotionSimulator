import { describe, expect, it } from 'vitest';
import { createTransactionalCommandBus } from '../src/v3/application/commandBus';

type TestState = {
  version: '3.0';
  revision: number;
  value: number;
  nested: {
    count: number;
  };
};

function createState(): TestState {
  return {
    version: '3.0',
    revision: 0,
    value: 1,
    nested: {
      count: 1
    }
  };
}

describe('v3 transactional command bus', () => {
  it('returns typed error for unknown command', () => {
    const holder = { state: createState() };
    const bus = createTransactionalCommandBus<TestState>({
      getState: () => holder.state,
      setState: (next) => {
        holder.state = next;
      }
    });

    const result = bus.execute({
      type: 'unknown',
      payload: {}
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error.code).toBe('unknown_command');
    expect(holder.state.revision).toBe(0);
  });

  it('rejects version conflict before executing handler', () => {
    const holder = { state: createState() };
    const bus = createTransactionalCommandBus<TestState>({
      getState: () => holder.state,
      setState: (next) => {
        holder.state = next;
      }
    });

    bus.register('increment', (state, payload: { delta: number }) => ({
      ...state,
      revision: state.revision + 1,
      value: state.value + payload.delta
    }));

    const result = bus.execute({
      type: 'increment',
      payload: { delta: 3 },
      expectedRevision: 99
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error.code).toBe('version_conflict');
    expect(holder.state.value).toBe(1);
    expect(holder.state.revision).toBe(0);
  });

  it('commits new state when command succeeds', () => {
    const holder = { state: createState() };
    const bus = createTransactionalCommandBus<TestState>({
      getState: () => holder.state,
      setState: (next) => {
        holder.state = next;
      }
    });

    bus.register('increment', (state, payload: { delta: number }) => ({
      ...state,
      revision: state.revision + 1,
      value: state.value + payload.delta
    }));

    const result = bus.execute({
      type: 'increment',
      payload: { delta: 2 },
      expectedRevision: 0
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success result');
    expect(holder.state.value).toBe(3);
    expect(holder.state.revision).toBe(1);
  });

  it('rolls back to pre-command snapshot when handler throws', () => {
    const holder = { state: createState() };
    const bus = createTransactionalCommandBus<TestState>({
      getState: () => holder.state,
      setState: (next) => {
        holder.state = next;
      }
    });

    bus.register('mutating_crash', (state) => {
      state.nested.count = 999;
      throw new Error('boom');
    });

    const result = bus.execute({
      type: 'mutating_crash',
      payload: {},
      expectedRevision: 0
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error.code).toBe('handler_failed');
    expect(holder.state.value).toBe(1);
    expect(holder.state.revision).toBe(0);
    expect(holder.state.nested.count).toBe(1);
  });
});
