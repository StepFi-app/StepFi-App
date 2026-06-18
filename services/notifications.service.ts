import { Platform } from 'react-native';
import type { Installment } from '../types/loan.types';

let ExpoNotifications: typeof import('expo-notifications') | null = null;
let ExpoCalendar: typeof import('expo-calendar') | null = null;

try {
  ExpoNotifications = require('expo-notifications');
} catch {}
try {
  ExpoCalendar = require('expo-calendar');
} catch {}

export interface CalendarEvent {
  title: string;
  notes: string;
  startDate: string;
  endDate: string;
}

const DAY_MS = 86_400_000;

function getReminderDates(dueDate: string): Date[] {
  const due = new Date(dueDate);
  const now = new Date();
  const dates: Date[] = [];

  for (const daysBefore of [14, 7, 3, 1]) {
    const reminder = new Date(due.getTime() - daysBefore * DAY_MS);
    if (reminder > now) {
      dates.push(reminder);
    }
  }

  return dates;
}

export const notificationsService = {
  async requestNotificationPermissions(): Promise<boolean> {
    if (!ExpoNotifications) return false;

    try {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleReminders(installments: Installment[]): Promise<void> {
    if (!ExpoNotifications) return;

    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const granted = await notificationsService.requestNotificationPermissions();
      if (!granted) return;
    }

    await ExpoNotifications.cancelAllScheduledNotificationsAsync();

    if (Platform.OS === 'web') return;

    for (const installment of installments) {
      if (installment.paid) continue;

      const reminderDates = getReminderDates(installment.dueDate);

      for (const date of reminderDates) {
        const daysBefore = Math.round((new Date(installment.dueDate).getTime() - date.getTime()) / DAY_MS);

        await ExpoNotifications.scheduleNotificationAsync({
          content: {
            title: 'Payment Reminder',
            body: `$${installment.amount.toLocaleString()} due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
            data: { dueDate: installment.dueDate, amount: installment.amount },
          },
          trigger: { type: ExpoNotifications.SchedulableTriggerInputTypes.DATE, date },
        });
      }
    }
  },

  async cancelAllReminders(): Promise<void> {
    if (!ExpoNotifications) return;
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  },

  async requestCalendarPermissions(): Promise<boolean> {
    if (!ExpoCalendar) return false;

    try {
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  async exportToCalendar(events: CalendarEvent[]): Promise<boolean> {
    if (!ExpoCalendar) return false;

    const granted = await notificationsService.requestCalendarPermissions();
    if (!granted) return false;
    if (Platform.OS === 'web') return true;

    try {
      const defaultCalendarSource =
        Platform.OS === 'ios'
          ? await ExpoCalendar.getDefaultCalendarAsync()
          : { isLocalAccount: true, name: 'StepFi', type: ExpoCalendar.CalendarSourceType.LOCAL };

      const calendarId = await ExpoCalendar.createCalendarAsync({
        title: 'StepFi Payments',
        color: '#22C55E',
        entityType: ExpoCalendar.EntityTypes.EVENT,
        source: defaultCalendarSource,
        name: 'stepfi-payments',
        ownerAccount: 'stepfi',
        accessLevel: ExpoCalendar.CalendarAccessLevel.OWNER,
      });

      for (const event of events) {
        await ExpoCalendar.createEventAsync(calendarId, {
          title: event.title,
          notes: event.notes,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

      return true;
    } catch {
      return false;
    }
  },

  calculateStreak(installments: Installment[]): number {
    if (!installments.length) return 0;

    const sorted = [...installments].sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    );

    let streak = 0;
    for (const installment of sorted) {
      if (installment.paid) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },
};
