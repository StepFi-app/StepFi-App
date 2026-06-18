import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  Bell,
  CheckSquare,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { EmptyState } from '../../components/shared/EmptyState';
import Loader from '../../components/shared/Loader';
import { useInstallmentCalendar } from '../../hooks/useInstallmentCalendar';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCurrency, formatDate } from '../../src/locales/i18n';
import type { CalendarDayData, CalendarEventData } from '../../hooks/useInstallmentCalendar';

function EventIndicator({ events }: { events: CalendarEventData[] }) {
  if (!events.length) return null;

  const paidCount = events.filter((e) => e.isPaid).length;
  const unpaidCount = events.length - paidCount;

  return (
    <View className="flex-row gap-0.5 mt-0.5">
      {unpaidCount > 0 && (
        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.warning }} />
      )}
      {paidCount > 0 && (
        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
      )}
    </View>
  );
}

function DayCell({
  day,
  isSelected,
  onPress,
}: {
  day: CalendarDayData;
  isSelected: boolean;
  onPress: () => void;
}) {
  const hasEvents = day.events.length > 0;

  return (
    <TouchableOpacity
      className="flex-1 items-center py-1.5"
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View
        className={`w-9 h-9 items-center justify-center rounded-full ${
          isSelected ? '' : ''
        }`}
        style={{
          backgroundColor: isSelected
            ? colors.brandGreen
            : day.isToday
            ? colors.brandGreenDim
            : 'transparent',
        }}
      >
        <Text
          className="text-sm"
          style={{
            color: isSelected
              ? colors.ctaText
              : day.isToday
              ? colors.brandGreen
              : day.isCurrentMonth
              ? colors.textPrimary
              : colors.textFaint,
            fontWeight: isSelected || day.isToday ? '700' : '400',
          }}
        >
          {day.date.getDate()}
        </Text>
      </View>
      {hasEvents && !isSelected ? <EventIndicator events={day.events} /> : null}
    </TouchableOpacity>
  );
}

function SelectedDayPanel({ day, t }: { day: CalendarDayData; t: (key: string, opts?: any) => string }) {
  if (!day.events.length) {
    return (
      <View
        className="rounded-2xl p-5 items-center"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
      >
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {t('calendar.noPaymentsOnDay')}
          </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="p-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
            {formatDate(day.date, 'long')}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {day.events.length} {day.events.length > 1 ? t('calendar.payments') : t('calendar.payment')}
          </Text>
      </View>
      {day.events.map((event, idx) => (
        <View
          key={`${event.loanId}-${event.dueDate}-${idx}`}
          className="flex-row items-center justify-between px-4 py-3"
          style={{
            borderBottomWidth: idx < day.events.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{
                backgroundColor: event.isPaid ? colors.successDim : colors.warningDim,
              }}
            >
              {event.isPaid ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <Clock size={16} color={colors.warning} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {event.loanName}
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {formatCurrency(event.amount)}
              </Text>
            </View>
          </View>
          <Text
            className="text-xs font-semibold"
            style={{ color: event.isPaid ? colors.success : colors.warning }}
          >
            {event.isPaid ? t('calendar.eventPaid') : t('calendar.eventDue')}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const weekdayHeaders = t('weekdayHeaders', { returnObjects: true }) as string[];
  const monthNames = t('monthNames', { returnObjects: true }) as string[];
  const {
    currentMonth,
    weeks,
    isLoading,
    error,
    refetch,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    selectedDay,
    selectDay,
    allEvents,
    exportToCalendar,
    scheduleReminders,
    paymentStreak,
  } = useInstallmentCalendar();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleExport = React.useCallback(async () => {
    const success = await exportToCalendar();
    if (success) {
      Alert.alert(t('calendar.calendarExported'), t('calendar.calendarExportedMessage'));
    } else {
      Alert.alert(t('calendar.permissionRequired'), t('calendar.permissionRequiredMessage'));
    }
  }, [exportToCalendar, t]);

  const handleScheduleReminders = React.useCallback(async () => {
    await scheduleReminders();
    Alert.alert(t('calendar.remindersSet'), t('calendar.remindersSetMessage'));
  }, [scheduleReminders, t]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (error && !isRefreshing) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={AlertCircle}
          title={t('common.somethingWentWrong')}
          message={error ?? ''}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{ label: t('common.tryAgain'), onPress: () => { void refetch(); } }}
        />
      </SafeAreaView>
    );
  }

  if (!allEvents.length && !isLoading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={CalendarIcon}
          title={t('calendar.noPaymentsScheduled')}
          message={t('calendar.noPaymentsMessage')}
        />
      </SafeAreaView>
    );
  }

  const monthYear = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const totalDue = allEvents.filter((e) => !e.isPaid).length;
  const totalPaid = allEvents.filter((e) => e.isPaid).length;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.brandGreen} />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('calendar.calendar')}
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.subtle }}
              activeOpacity={0.7}
              onPress={handleScheduleReminders}
            >
              <Bell size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.subtle }}
              activeOpacity={0.7}
              onPress={handleExport}
            >
              <CheckSquare size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Card */}
        <View className="mx-4 mb-4">
          <View
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.brandGreenDim }}
              >
                <CheckCircle size={20} color={colors.brandGreen} />
              </View>
              <View>
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {t('calendar.paymentStreak')}
                </Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {t('calendar.paymentStreakDesc')}
                </Text>
              </View>
            </View>
            <Text className="text-2xl font-bold" style={{ color: colors.brandGreen }}>
              {paymentStreak}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View className="flex-row gap-3 mx-4 mb-4">
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.warningDim }}
          >
            <Text className="text-xs" style={{ color: colors.warning }}>
              {t('calendar.due')}
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.warning }}>
              {totalDue}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.successDim }}
          >
            <Text className="text-xs" style={{ color: colors.success }}>
              {t('calendar.paid')}
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.success }}>
              {totalPaid}
            </Text>
          </View>
        </View>

        {/* Calendar Widget */}
        <View
          className="mx-4 rounded-2xl p-4"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          {/* Month Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.subtle }}
              activeOpacity={0.7}
              onPress={goToPrevMonth}
            >
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={goToToday}>
              <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                {monthYear}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.subtle }}
              activeOpacity={0.7}
              onPress={goToNextMonth}
            >
              <ChevronRight size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View className="flex-row mb-2">
            {weekdayHeaders.map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} className="flex-row mb-1">
              {week.map((day, dayIdx) => {
                const isSelected =
                  selectedDay?.date.getTime() === day.date.getTime();
                return (
                  <DayCell
                    key={dayIdx}
                    day={day}
                    isSelected={isSelected}
                    onPress={() => selectDay(isSelected ? null : day)}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Day Details */}
        {selectedDay ? (
          <View className="mx-4 mt-4">
            <SelectedDayPanel day={selectedDay} t={t} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
