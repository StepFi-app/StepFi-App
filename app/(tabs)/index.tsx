import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  ArrowUpRight,
  History,
  BadgeCheck,
  GraduationCap,
  Laptop,
  Calendar,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { EmptyState } from '../../components/shared/EmptyState';
import { useUserStore } from '../../stores/user.store';
import { useLoansStore } from '../../stores/loans.store';
import { useAuthStore } from '../../stores/auth.store';
import { loansService } from '../../services/loans.service';
import { reputationService } from '../../services/reputation.service';
import { ReputationProgressWidget } from '../../components/reputation/ReputationProgressWidget';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCurrency, formatDate } from '../../src/locales/i18n';
import type { AvailableCredit } from '../../services/loans.service';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const reputation = useUserStore((s) => s.reputation);
  const setReputation = useUserStore((s) => s.setReputation);
  const loans = useLoansStore((s) => s.loans);
  const setLoans = useLoansStore((s) => s.setLoans);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const [credit, setCredit] = useState<AvailableCredit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.displayName ?? t('home.greeting');

  const fetchDashboard = useCallback(async () => {
    setError(null);
    try {
      const [loansData, creditData, repData] = await Promise.allSettled([
        loansService.getMyLoans(),
        loansService.getAvailableCredit(),
        walletAddress ? reputationService.getScore(walletAddress) : Promise.resolve(null),
      ]);

      if (loansData.status === 'fulfilled') setLoans(loansData.value);
      if (creditData.status === 'fulfilled') setCredit(creditData.value);
      if (repData.status === 'fulfilled' && repData.value) setReputation(repData.value);
    } catch {
      setError(t('home.errorLoading'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [walletAddress, setLoans, setReputation]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchDashboard();
  };

  const pendingTransactions = useLoansStore((s) => s.pendingTransactions);
  const setPendingTransactions = useLoansStore((s) => s.setPendingTransactions);

  // Sync pending txs from the persisted queue on mount
  useEffect(() => {
    import('../../src/transactions/pending-queue').then(({ pendingQueue }) => {
      pendingQueue.getAll().then(setPendingTransactions);
    });
  }, [setPendingTransactions]);

  const activeLoans = loans.filter((l) => l.status === 'active');
  const nextInstallment = activeLoans
    .flatMap((l) => l.installments.filter((i) => !i.paid).map((i) => ({ ...i, loanId: l.id })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const upcomingPayments = activeLoans
    .flatMap((l) =>
      l.installments
        .filter((i) => !i.paid)
        .map((i) => ({ ...i, loanTitle: l.totalAmount.toString(), loanId: l.id }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3); // Get next 3

  if (error && !isRefreshing) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={AlertCircle}
          title={t('common.somethingWentWrong')}
          message={error ?? ''}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{
            label: t('common.tryAgain'),
            onPress: () => {
              setIsLoading(true);
              void fetchDashboard();
            },
          }}
        />
      </SafeAreaView>
    );
  }

  const formatCurrency = (amount: number) => {
    const whole = Math.floor(amount).toLocaleString();
    const decimal = (amount % 1).toFixed(2).substring(1);
    return { whole, decimal };
  };

  const creditFormatted = credit
    ? formatCurrency(credit.available)
    : { whole: '0', decimal: '.00' };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brandGreen}
          />
        }>
        {/* Hero Card */}
        <View
          className="mb-6 overflow-hidden rounded-xl p-5 shadow-sm"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            borderTopWidth: 2,
            borderTopColor: colors.brandGreen,
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="mb-1 text-sm font-medium" style={{ color: colors.textSecondary }}>
                {t('home.availableCredit')}
              </Text>
              <View className="flex-row items-end">
                <Text className="text-4xl font-bold" style={{ color: colors.brandGreen }}>
                  ${creditFormatted.whole}
                </Text>
                <Text className="pb-1 text-lg font-bold" style={{ color: colors.textSecondary }}>
                  {creditFormatted.decimal}
                </Text>
              </View>
            </View>
            <View
              className="rounded-md px-2 py-0.5"
              style={{ backgroundColor: colors.brandGreen + '15' }}>
              <Text
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: colors.brandGreen }}>
                {t('home.activeLimit')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="mt-4 flex-col gap-1">
            <View className="flex-row justify-between">
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t('home.used')}: ${credit?.used?.toLocaleString() ?? '0'}
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
                {t('home.limit')}: ${credit?.limit?.toLocaleString() ?? '0'}
              </Text>
            </View>
            <View
              className="h-2 w-full flex-row overflow-hidden rounded-full"
              style={{ backgroundColor: colors.subtle }}>
              {credit && credit.limit > 0 ? (
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: colors.brandGreen,
                    width: `${(credit.used / credit.limit) * 100}%`,
                  }}
                />
              ) : null}
            </View>
          </View>
        </View>

        {/* Pending Transactions Banner */}
        {pendingTransactions.filter((tx) => tx.status === 'pending').length > 0 && (
          <View
            className="mb-4 flex-row items-center gap-3 rounded-xl border p-4"
            style={{
              backgroundColor: colors.warningDim,
              borderColor: colors.warning + '40',
            }}>
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: colors.warning + '20' }}>
              <Loader size={20} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.warning }}>
                Transaction In Progress
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
                {pendingTransactions.filter((tx) => tx.status === 'pending').length} pending
                transaction(s) — tracking on-chain
              </Text>
            </View>
          </View>
        )}

        {/* Transaction Result Banner */}
        {pendingTransactions.filter(
          (tx) => tx.status === 'confirmed' || tx.status === 'failed' || tx.status === 'expired'
        ).length > 0 && (
          <View className="mb-4 gap-2 rounded-xl p-3" style={{ backgroundColor: colors.subtle }}>
            <Text className="mb-1 text-xs font-semibold" style={{ color: colors.textMuted }}>
              Recent Transactions
            </Text>
            {pendingTransactions
              .filter((tx) => tx.status !== 'pending')
              .slice(0, 5)
              .map((tx) => {
                const isConfirmed = tx.status === 'confirmed';
                const isFailed = tx.status === 'failed' || tx.status === 'expired';
                const StatusIcon = isConfirmed ? CheckCircle : XCircle;
                const statusColor = isConfirmed ? colors.success : colors.error;
                return (
                  <View key={tx.id} className="flex-row items-center gap-2 rounded-lg py-2">
                    <StatusIcon size={14} color={statusColor} />
                    <Text className="flex-1 text-xs" style={{ color: colors.textSecondary }}>
                      {tx.type === 'REPAYMENT'
                        ? 'Repayment'
                        : tx.type === 'LOAN_CREATION'
                          ? 'Loan Creation'
                          : tx.type}{' '}
                      — ${tx.amount?.toLocaleString() ?? ''}
                    </Text>
                    <Text className="text-[10px]" style={{ color: statusColor }}>
                      {isConfirmed ? 'Confirmed' : 'Failed'}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Quick Actions Grid */}
        <View className="mb-8 flex-row justify-between">
          {[
            {
              icon: Plus,
              label: t('home.apply'),
              color: colors.brandGreen,
              route: '/(tabs)/simulate',
            },
            {
              icon: ArrowUpRight,
              label: t('home.pay'),
              color: colors.textPrimary,
              route: '/(tabs)/loans',
            },
            {
              icon: History,
              label: t('home.history'),
              color: colors.textPrimary,
              route: '/(tabs)/calendar',
            },
            {
              icon: BadgeCheck,
              label: t('home.vouches'),
              color: colors.textPrimary,
              route: '/(tabs)/reputation',
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              className="flex-col items-center gap-2"
              activeOpacity={0.7}
              onPress={() => action.route && router.push(action.route as any)}>
              <View
                className="flex h-14 w-14 items-center justify-center rounded-full border"
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
                <action.icon size={24} color={action.color} />
              </View>
              <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reputation Progress Widget */}
        <ReputationProgressWidget />

        {/* Active Loans Horizontal Scroll */}
        <View className="mb-8 flex-col gap-3">
          <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
            {t('home.activeLoans')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16 }}
            className="overflow-visible">
            {activeLoans.map((loan, idx) => (
              <View
                key={loan.id}
                className="w-[280px] flex-col gap-4 rounded-xl border p-4"
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.subtle }}>
                      {idx % 2 === 0 ? (
                        <GraduationCap size={16} color={colors.textSecondary} />
                      ) : (
                        <Laptop size={16} color={colors.textSecondary} />
                      )}
                    </View>
                    <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                      {t('common.loanNumber', { id: loan.id.slice(0, 4) })}
                    </Text>
                  </View>
                  <View
                    className="rounded-md border px-2 py-1"
                    style={{ backgroundColor: colors.subtle, borderColor: colors.borderSubtle }}>
                    <Text className="text-xs font-semibold" style={{ color: colors.brandGreen }}>
                      {t('home.active')}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    {t('home.remainingBalance')}
                  </Text>
                  <View className="flex-row items-end gap-1">
                    <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                      ${loan.remainingBalance.toLocaleString()}
                    </Text>
                  </View>
                </View>
                {/* Visual Segments */}
                <View className="mt-2 flex-row items-center gap-1">
                  <View
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: colors.brandGreen }}
                  />
                  <View
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: colors.subtle }}
                  />
                  <View
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: colors.subtle }}
                  />
                  <View
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: colors.subtle }}
                  />
                </View>
              </View>
            ))}
            {activeLoans.length === 0 && (
              <View
                className="w-[280px] items-center justify-center rounded-xl border p-5"
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
                <Text style={{ color: colors.textSecondary }}>{t('home.noActiveLoans')}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Upcoming Payments List */}
        <View className="flex-col gap-3">
          <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
            {t('home.upcomingPayments')}
          </Text>
          <View
            className="overflow-hidden rounded-xl border"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
            {upcomingPayments.length > 0 ? (
              upcomingPayments.map((payment, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between border-b p-4"
                  style={{
                    borderBottomColor:
                      idx === upcomingPayments.length - 1 ? 'transparent' : colors.borderSubtle,
                  }}>
                  <View className="flex-row items-center gap-3">
                    <View
                      className="flex h-10 w-10 items-center justify-center rounded-lg border"
                      style={{ backgroundColor: colors.subtle, borderColor: colors.borderSubtle }}>
                      <Calendar
                        size={20}
                        color={idx === 0 ? colors.textPrimary : colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text
                        className="text-base font-semibold"
                        style={{ color: colors.textPrimary }}>
                        {t('home.installment')}
                      </Text>
                      <Text className="text-sm" style={{ color: colors.textSecondary }}>
                        {t('common.loanNumber', { id: payment.loanId.slice(0, 4) })} ·{' '}
                        {t('home.due')} {formatDate(new Date(payment.dueDate), 'short')}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                      ${payment.amount.toLocaleString()}
                    </Text>
                    {idx === 0 ? (
                      <Text
                        className="mt-1 text-xs font-semibold"
                        style={{ color: colors.brandGreen }}>
                        {t('home.payNow')}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="items-center p-6">
                <Text style={{ color: colors.textSecondary }}>{t('home.noUpcomingPayments')}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
