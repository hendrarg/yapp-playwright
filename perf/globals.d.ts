// k6 provides console at runtime, but @types/k6 does not declare it and the DOM lib would drag in browser globals.
declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
