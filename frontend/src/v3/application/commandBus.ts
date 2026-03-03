import type {
  CommandEnvelope,
  CommandExecutionResult
} from './types';

type RevisionedState = {
  revision: number;
};

type CommandHandler<S extends RevisionedState, P = unknown> = (
  state: S,
  payload: P
) => S;

type CommandBusOptions<S extends RevisionedState> = {
  getState: () => S;
  setState: (next: S) => void;
  cloneState?: (state: S) => S;
};

type RegisteredHandlers<S extends RevisionedState> = Map<string, CommandHandler<S>>;

function cloneWithFallback<S>(value: S): S {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as S;
}

export function createTransactionalCommandBus<S extends RevisionedState>(
  options: CommandBusOptions<S>
) {
  const handlers: RegisteredHandlers<S> = new Map();
  const cloneState = options.cloneState ?? cloneWithFallback<S>;

  function register<P>(type: string, handler: CommandHandler<S, P>) {
    handlers.set(type, handler as CommandHandler<S>);
  }

  function execute<P>(envelope: CommandEnvelope<P>): CommandExecutionResult<S> {
    const type = String(envelope.type ?? '').trim();
    if (!handlers.has(type)) {
      return {
        ok: false,
        error: {
          code: 'unknown_command',
          message: `Unknown command: ${type || '<empty>'}`
        }
      };
    }

    const baseline = cloneState(options.getState());
    if (
      Number.isFinite(envelope.expectedRevision) &&
      envelope.expectedRevision !== baseline.revision
    ) {
      return {
        ok: false,
        error: {
          code: 'version_conflict',
          message: `Expected revision ${envelope.expectedRevision}, got ${baseline.revision}`
        }
      };
    }

    const handler = handlers.get(type)!;
    const working = cloneState(baseline);
    try {
      const returned = handler(working, envelope.payload);
      const nextState = returned ?? working;
      options.setState(nextState);
      return {
        ok: true,
        state: nextState
      };
    } catch (error) {
      options.setState(cloneState(baseline));
      return {
        ok: false,
        error: {
          code: 'handler_failed',
          message: `Command handler failed: ${type}`,
          cause: error
        }
      };
    }
  }

  return {
    register,
    execute
  };
}

