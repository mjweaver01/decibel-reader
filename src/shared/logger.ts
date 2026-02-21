import { DEBUG } from './constants';

export function log(message: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(message, ...args);
  }
}

export function error(message: string, ...args: unknown[]) {
  console.error(message, ...args);
}

export const logger = Object.assign(log, {
  log,
  error,
});
