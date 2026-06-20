import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
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
  action: Omit<QueueAction, 'id' | 'timestamp'>,
): Promise<QueueAction> {
  const queue = await getQueue();
  const newAction: QueueAction = {
    ...action,
    id: generateId(),
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
