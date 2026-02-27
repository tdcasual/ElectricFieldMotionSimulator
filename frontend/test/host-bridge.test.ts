import { describe, expect, it } from 'vitest';
import { executeHostCommand, installHostCommandBridge, parseHostCommandMessage } from '../src/embed/hostBridge';

describe('host bridge', () => {
  it('parses valid host command message', () => {
    const message = parseHostCommandMessage({
      source: 'electric-field-host',
      type: 'command',
      id: 'req-1',
      command: 'play'
    });
    expect(message).not.toBeNull();
    expect(message?.command).toBe('play');
    expect(message?.id).toBe('req-1');
  });

  it('rejects invalid host message', () => {
    const message = parseHostCommandMessage({
      source: 'other',
      type: 'command',
      command: 'play'
    });
    expect(message).toBeNull();
  });

  it('executes play and pause commands', () => {
    const calls: string[] = [];
    const store = {
      startRunning: () => calls.push('start'),
      stopRunning: () => calls.push('stop'),
      toggleRunning: () => calls.push('toggle'),
      resetScene: () => calls.push('reset'),
      loadSceneData: () => true
    };

    const play = executeHostCommand(store, {
      source: 'electric-field-host',
      type: 'command',
      command: 'play'
    });
    const pause = executeHostCommand(store, {
      source: 'electric-field-host',
      type: 'command',
      command: 'pause'
    });

    expect(play.ok).toBe(true);
    expect(pause.ok).toBe(true);
    expect(calls).toEqual(['start', 'stop']);
  });

  it('executes loadScene command and returns validation error when rejected', () => {
    const store = {
      startRunning: () => {},
      stopRunning: () => {},
      toggleRunning: () => {},
      resetScene: () => {},
      loadSceneData: () => false
    };

    const result = executeHostCommand(store, {
      source: 'electric-field-host',
      type: 'command',
      command: 'loadScene',
      payload: { version: '1.0', settings: {}, objects: [] }
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('validation');
  });

  it('emits command-result through message bridge', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const store = {
      startRunning: () => {},
      stopRunning: () => {},
      toggleRunning: () => {},
      resetScene: () => {},
      loadSceneData: () => true
    };
    const dispose = installHostCommandBridge(store, {
      emit: (type, payload) => events.push({ type, payload })
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'electric-field-host',
          type: 'command',
          id: 'req-7',
          command: 'play'
        }
      })
    );

    dispose();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('command-result');
    expect(events[0].payload.id).toBe('req-7');
    expect(events[0].payload.ok).toBe(true);
  });
});
