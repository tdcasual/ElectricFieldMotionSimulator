export type CommandEnvelope<P = unknown> = {
  type: string;
  payload: P;
  expectedRevision?: number;
};

export type CommandExecutionErrorCode =
  | 'unknown_command'
  | 'version_conflict'
  | 'handler_failed';

export type CommandExecutionError = {
  code: CommandExecutionErrorCode;
  message: string;
  cause?: unknown;
};

export type CommandExecutionSuccess<S> = {
  ok: true;
  state: S;
};

export type CommandExecutionFailure = {
  ok: false;
  error: CommandExecutionError;
};

export type CommandExecutionResult<S> =
  | CommandExecutionSuccess<S>
  | CommandExecutionFailure;

