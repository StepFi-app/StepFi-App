import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { useLoansStore } from '../../stores/loans.store';
import { loansService } from '../../services/loans.service';
import type { Loan, LoanStatus } from '../../types/loan.types';

function getStatusConfig(status: LoanStatus): {
  label: string;
  color: string;
  bg: string;
  icon: typeof CheckCircle;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: colors.brandBlue, bg: colors.brandBlueDim, icon: Clock };
    case 'paid':
      return { label: 'Paid', color: colors.success, bg: colors.successDim, icon: CheckCircle };
    case 'defaulted':
      return { label: 'Defaulted', color: colors.error, bg: colors.errorDim, icon: XCircle };
    case 'pending':
      return { label: 'Pending', color: colors.warning, bg: colors.warningDim, icon: Clock };
    case 'cancelled':
      return { label: 'Cancelled', color: colors.textMuted, bg: colors.subtle, icon: XCircle };
    default:
      return { label: status, color: colors.textMuted, bg: colors.subtle, icon: Clock };
  }
}

interface LoanCardProps {
  loan: Loan;
}

function LoanCard({ loan }: LoanCardProps) {
  const statusConfig = getStatusConfig(loan.status);
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
              Loan #{loan.id.slice(0, 8)}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {new Date(loan.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Status badge */}
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

      {/* Amounts */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            Total amount
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
            Remaining
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
            Installments
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {paidCount} of {totalCount} paid
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
  const loans = useLoansStore((s) => s.loans);
  const setLoans = useLoansStore((s) => s.setLoans);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setError(null);
    try {
      const data = await loansService.getMyLoans();
      setLoans(data);
    } catch {
      setError('Could not load your loans. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setLoans]);

  useEffect(() => {
    void fetchLoans();
  }, [fetchLoans]);

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
          title="Something went wrong"
          message={error}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{ label: 'Try again', onPress: () => { setIsLoading(true); void fetchLoans(); } }}
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
          title="No loans yet"
          message="Apply for your first loan to finance laptops, courses, and dev tools."
          action={{ label: 'Apply now', onPress: () => {} }}
        />
      </SafeAreaView>
    );
  }

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
          My Loans
        </Text>

        {/* Summary */}
        <View className="flex-row gap-3 mb-5">
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.brandBlueDim }}
          >
            <Text className="text-xs" style={{ color: colors.brandBlue }}>
              Active
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
              Paid
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
              Pending
            </Text>
            <Text className="text-lg font-bold" style={{ color: colors.warning }}>
              {loans.filter((l) => l.status === 'pending').length}
            </Text>
          </View>
        </View>

        {/* Loan list */}
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
