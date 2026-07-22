import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  RefreshCw,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { useLoansStore } from '../../stores/loans.store';
import { loansService } from '../../services/loans.service';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../src/locales/i18n';
import { pendingQueue } from '../../src/transactions/pending-queue';
import type { Loan, LoanStatus } from '../../types/loan.types';
import type { PendingTransaction } from '../../types/transaction.types';

function getStatusConfig(status: LoanStatus, t: (key: string, opts?: any) => string): {
  label: string;
  color: string;
  bg: string;
  icon: typeof CheckCircle;
} {
  switch (status) {
    case 'active':
      return { label: t('loans.statusActive'), color: colors.brandBlue, bg: colors.brandBlueDim, icon: Clock };
    case 'paid':
      return { label: t('loans.statusPaid'), color: colors.success, bg: colors.successDim, icon: CheckCircle };
    case 'defaulted':
      return { label: t('loans.statusDefaulted'), color: colors.error, bg: colors.errorDim, icon: XCircle };
    case 'pending':
      return { label: t('loans.statusPending'), color: colors.warning, bg: colors.warningDim, icon: Clock };
    case 'cancelled':
      return { label: t('loans.statusCancelled'), color: colors.textMuted, bg: colors.subtle, icon: XCircle };
    default:
      return { label: status, color: colors.textMuted, bg: colors.subtle, icon: Clock };
  }
}

/** Small badge showing if a loan has a pending on-chain tx. */
function PendingTxBadge({ loanId }: { loanId: string }) {
  const pendingTransactions = useLoansStore((s) => s.pendingTransactions);
  const loanPendingTxs = pendingTransactions.filter(
    (tx) => tx.targetLoanId === loanId && tx.status === 'pending',
  );

  if (loanPendingTxs.length === 0) return null;

  return (
    <View
      className="flex-row items-center gap-1 rounded-lg px-2 py-0.5"
      style={{ backgroundColor: colors.warningDim }}
    >
      <Loader size={10} color={colors.warning} />
      <Text className="text-[10px] font-semibold" style={{ color: colors.warning }}>
        {loanPendingTxs.length} pending
      </Text>
    </View>
  );
}

interface LoanCardProps {
  loan: Loan;
  t: (key: string, opts?: any) => string;
}

function LoanCard({ loan, t }: LoanCardProps) {
  const statusConfig = getStatusConfig(loan.status, t);
  const StatusIcon = statusConfig.icon;

  const paidCount = loan.installments.filter((i) => i.paid).length;
  const totalCount = loan.installments.length;
  const progress = totalCount > 0 ? paidCount / totalCount : 0;

  return (
    <Card className="mb-3 p-4 gap-3">
      {/* Top row — vendor + status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.brandBlueDim }}
          >
            <CreditCard size={20} color={colors.brandBlue} />
          </View>
          <View>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.textPrimary }}
            >
              {t('common.loanNumber', { id: loan.id.slice(0, 8) })}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {formatDate(new Date(loan.createdAt), 'full')}
            </Text>
          </View>
        </View>

        {/* Status badge + pending indicator */}
        <View className="flex-row items-center gap-2">
          <PendingTxBadge loanId={loan.id} />
          <View
            className="flex-row items-center gap-1 rounded-xl px-3 py-1"
            style={{ backgroundColor: statusConfig.bg }}
          >
            <StatusIcon size={12} color={statusConfig.color} />
            <Text
              className="text-xs font-semibold"
              style={{ color: statusConfig.color }}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Amounts */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {t('loans.totalAmount')}
          </Text>
          <Text
            className="text-lg font-bold"
            style={{ color: colors.textPrimary }}
          >
            ${loan.totalAmount.toLocaleString()}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {t('loans.remaining')}
          </Text>
          <Text
            className="text-lg font-bold"
            style={{ color: colors.textSecondary }}
          >
            ${loan.remainingBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {t('loans.installments')}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {t('loans.installmentsPaid', { paid: paidCount, total: totalCount })}
          </Text>
        </View>
        <View
          className="h-2 rounded-full w-full"
          style={{ backgroundColor: colors.subtle }}
        >
          <View
            className="h-2 rounded-full"
            style={{
              backgroundColor: colors.brandGreen,
              width: `${Math.round(progress * 100)}%`,
            }}
          />
        </View>
      </View>
    </Card>
  );
}

export default function LoansScreen() {
  const { t } = useTranslation();
  const loans = useLoansStore((s) => s.loans);
  const setLoans = useLoansStore((s) => s.setLoans);
  const pendingTransactions = useLoansStore((s) => s.pendingTransactions);
  const setPendingTransactions = useLoansStore((s) => s.setPendingTransactions);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync pending txs from the persisted queue on mount
  const syncPendingTxs = useCallback(async () => {
    const pendings = await pendingQueue.getAll();
    setPendingTransactions(pendings);
  }, [setPendingTransactions]);

  const fetchLoans = useCallback(async () => {
    setError(null);
    try {
      const data = await loansService.getMyLoans();
      setLoans(data);
      await syncPendingTxs();
    } catch {
      setError(t('loans.errorLoading'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setLoans, syncPendingTxs]);

  useEffect(() => {
    void fetchLoans();
  }, [fetchLoans]);

  // Re-sync pending txs periodically and whenever local count changes
  useEffect(() => {
    const interval = setInterval(syncPendingTxs, 5000);
    return () => clearInterval(interval);
  }, [syncPendingTxs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchLoans();
  };

  // Error state
  if (error && !isRefreshing && !isLoading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={AlertCircle}
          title={t('common.somethingWentWrong')}
          message={error ?? ''}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{ label: t('common.tryAgain'), onPress: () => { setIsLoading(true); void fetchLoans(); } }}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!isLoading && loans.length === 0) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={CreditCard}
          title={t('loans.noLoansYet')}
          message={t('loans.noLoansMessage')}
          action={{ label: t('loans.applyNow'), onPress: () => {} }}
        />
      </SafeAreaView>
    );
  }

  const pendingCount = pendingTransactions.filter((tx) => tx.status === 'pending').length;
  const recentCompleted = pendingTransactions
    .filter((tx) => tx.status !== 'pending')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brandGreen}
          />
        }
      >
        <Text
          className="text-2xl font-bold mt-2 mb-6"
          style={{ color: colors.textPrimary }}
        >
          {t('loans.myLoans')}
        </Text>

        {/* Pending Transactions Banner */}
        {pendingCount > 0 && (
          <View
            className="rounded-xl p-4 mb-4 flex-row items-center gap-3 border"
            style={{
              backgroundColor: colors.warningDim,
              borderColor: colors.warning + '40',
            }}
          >
            <View
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.warning + '20' }}
            >
              <Loader size={20} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.warning }}>
                Transactions In Progress
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {pendingCount} pending transaction(s) — status being tracked on-chain
              </Text>
            </View>
          </View>
        )}

        {/* Recent Completed Transactions */}
        {recentCompleted.length > 0 && (
          <View
            className="rounded-xl p-3 mb-4 gap-1.5"
            style={{ backgroundColor: colors.subtle }}
          >
            <Text className="text-xs font-semibold mb-1" style={{ color: colors.textMuted }}>
              Recent Transaction Activity
            </Text>
            {recentCompleted.map((tx) => {
              const isConfirmed = tx.status === 'confirmed';
              const StatusIcon = isConfirmed ? CheckCircle : XCircle;
              const statusColor = isConfirmed ? colors.success : colors.error;
              return (
                <View
                  key={tx.id}
                  className="flex-row items-center gap-2 py-1.5"
                >
                  <StatusIcon size={14} color={statusColor} />
                  <Text className="text-xs flex-1" style={{ color: colors.textSecondary }}>
                    {tx.type === 'REPAYMENT' ? 'Repayment' : tx.type === 'LOAN_CREATION' ? 'Loan' : tx.type}
                    {tx.amount ? ` — $${tx.amount.toLocaleString()}` : ''}
                  </Text>
                  <Text className="text-[10px]" style={{ color: statusColor }}>
                    {isConfirmed ? 'Confirmed' : tx.status === 'expired' ? 'Expired' : 'Failed'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Summary */}
        <View className="flex-row gap-3 mb-5">
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.brandBlueDim }}
          >
            <Text className="text-xs" style={{ color: colors.brandBlue }}>
              {t('loans.active')}
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.brandBlue }}>
              {loans.filter((l) => l.status === 'active').length}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.successDim }}
          >
            <Text className="text-xs" style={{ color: colors.success }}>
              {t('loans.paid')}
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.success }}>
              {loans.filter((l) => l.status === 'paid').length}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.warningDim }}
          >
            <Text className="text-xs" style={{ color: colors.warning }}>
              {t('loans.pending')}
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.warning }}>
              {loans.filter((l) => l.status === 'pending').length}
            </Text>
          </View>
        </View>

        {/* Loan list */}
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} t={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
