import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return version;
}

export function incrementRecordingsVersion() {
  version += 1;
  listeners.forEach(l => l());
}

export function useRecordingsVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
