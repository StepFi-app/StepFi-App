import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const QUEUE_KEY = '@stepfi/offline-queue';

export type QueueActionType =
  | 'REPAY_INSTALLMENT'
  | 'SUBMIT_VOUCH'
  | 'DEPOSIT'
  | 'CREATE_LOAN'
  | 'SUBMIT_SIGNED_XDR';

export interface QueueAction {
  id: string;
  type: QueueActionType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  /** Stable idempotency key that survives replays – the API uses this to
   *  detect and discard duplicate submissions. */
  idempotencyKey: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

/**
 * Generate an idempotency key that is **stable per queue item** but unique
 * across different enqueues — even for identical payloads.
 *
 * The key is stored alongside the action and never changes. During queue
 * replay the same key is sent in the `Idempotency-Key` header so the API
 * can detect and discard duplicates if `processQueue` crashes between the
 * successful HTTP call and the `dequeueAction` cleanup.
 *
 * The random prefix ensures keys are globally unique; the payload hash
 * provides a secondary dimension for observability / debugging.
 */
async function generateIdempotencyKey(
  action: Omit<QueueAction, 'id' | 'timestamp' | 'idempotencyKey'>,
): Promise<string> {
  const payload = `${action.type}:${action.endpoint}:${JSON.stringify(action.data)}`;
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  return `${generateId()}::${digest.substring(0, 16)}`;
}

export async function getQueue(): Promise<QueueAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function enqueueAction(
  action: Omit<QueueAction, 'id' | 'timestamp' | 'idempotencyKey'>,
): Promise<QueueAction> {
  const queue = await getQueue();
  const newAction: QueueAction = {
    ...action,
    id: generateId(),
    idempotencyKey: await generateIdempotencyKey(action),
    timestamp: Date.now(),
  };
  queue.push(newAction);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return newAction;
}

export async function dequeueAction(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((a) => a.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
