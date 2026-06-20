import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLoansStore } from '../stores/loans.store';
import { loansService } from '../services/loans.service';
import { notificationsService } from '../services/notifications.service';
import type { Loan, Installment } from '../types/loan.types';

export interface CalendarEventData {
  loanId: string;
  loanName: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export interface CalendarDayData {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventData[];
}

export interface UseInstallmentCalendarReturn {
  currentMonth: Date;
  weeks: CalendarDayData[][];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToToday: () => void;
  selectedDay: CalendarDayData | null;
  selectDay: (day: CalendarDayData | null) => void;
  allEvents: CalendarEventData[];
  exportToCalendar: () => Promise<boolean>;
  scheduleReminders: () => Promise<void>;
  paymentStreak: number;
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function normalizeDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function buildWeeks(year: number, month: number, events: CalendarEventData[]): CalendarDayData[][] {
  const totalDays = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const allDays: CalendarDayData[] = [];

  const prevMonthTotal = daysInMonth(year, month - 1);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthTotal - i;
    const date = new Date(year, month - 1, d);
    const dateStr = normalizeDate(date.toISOString());
    allDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.dueDate === dateStr),
    });
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = normalizeDate(date.toISOString());
    allDays.push({
      date,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.dueDate === dateStr),
    });
  }

  const remaining = 42 - allDays.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    const dateStr = normalizeDate(date.toISOString());
    allDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.dueDate === dateStr),
    });
  }

  const weeks: CalendarDayData[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return weeks;
}

export function useInstallmentCalendar(): UseInstallmentCalendarReturn {
  const loans = useLoansStore((s) => s.loans);
  const setLoans = useLoansStore((s) => s.setLoans);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setError(null);
    try {
      const data = await loansService.getMyLoans();
      setLoans(data);
    } catch {
      setError('Could not load calendar data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [setLoans]);

  useEffect(() => {
    void fetchLoans();
  }, [fetchLoans]);

  const allEvents: CalendarEventData[] = useMemo(() => {
    const activeLoans = loans.filter(
      (l) => l.status === 'active' || l.status === 'pending',
    );

    return activeLoans.flatMap((loan) =>
      loan.installments.map((inst) => ({
        loanId: loan.id,
        loanName: `Loan #${loan.id.slice(0, 8)}`,
        amount: inst.amount,
        dueDate: normalizeDate(inst.dueDate),
        isPaid: inst.paid,
      })),
    );
  }, [loans]);

  const weeks = useMemo(
    () => buildWeeks(currentMonth.getFullYear(), currentMonth.getMonth(), allEvents),
    [currentMonth, allEvents],
  );

  const paymentStreak = useMemo(() => {
    const allInstallments: Installment[] = loans.flatMap((l) => l.installments);
    return notificationsService.calculateStreak(allInstallments);
  }, [loans]);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  }, []);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(null);
  }, []);

  const selectDay = useCallback(
    (day: CalendarDayData | null) => {
      setSelectedDay(day);
    },
    [],
  );

  const exportToCalendar = useCallback(async () => {
    return notificationsService.exportToCalendar(
      allEvents.map((e) => ({
        title: `StepFi Payment - ${e.loanName}`,
        notes: `Payment of $${e.amount.toLocaleString()} for ${e.loanName}`,
        startDate: e.dueDate,
        endDate: e.dueDate,
      })),
    );
  }, [allEvents]);

  const scheduleReminders = useCallback(async () => {
    const allInstallments: Installment[] = loans.flatMap((l) => l.installments);
    await notificationsService.scheduleReminders(allInstallments);
  }, [loans]);

  return {
    currentMonth,
    weeks,
    isLoading,
    error,
    refetch: fetchLoans,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    selectedDay,
    selectDay,
    allEvents,
    exportToCalendar,
    scheduleReminders,
    paymentStreak,
  };
}

export { WEEKDAY_HEADERS, MONTH_NAMES };
