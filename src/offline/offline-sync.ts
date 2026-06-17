import api from '../../services/api';
import { getQueue, dequeueAction } from './offline-queue';
import type { QueueAction } from './offline-queue';

export type SyncEventType = 'sync:start' | 'sync:complete' | 'sync:error' | 'sync:progress';

type SyncListener = (event: SyncEventType, action?: QueueAction, error?: Error) => void;

const listeners = new Set<SyncListener>();

export function onSyncEvent(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event: SyncEventType, action?: QueueAction, error?: Error) {
  listeners.forEach((fn) => fn(event, action, error));
}

export async function processQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  emit('sync:start');

  for (const action of queue) {
    try {
      emit('sync:progress', action);
      await api.request({
        method: action.method,
        url: action.endpoint,
        data: action.data,
        headers: { 'X-Offline-Sync': 'true' },
      });
      await dequeueAction(action.id);
    } catch (error) {
      emit('sync:error', action, error as Error);
    }
  }

  emit('sync:complete');
}
