import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInvest } from '../../hooks/invest/use-invest';
import { TransactionStatus } from '../../types/transaction.types';
// Centralized color palette shared with Tailwind
const colors = require('../../theme/colors.json');

const InvestScreen = () => {
  const {
    depositAmount,
    scrollViewRef,
    formatCurrency,
    handleAmountChange,
    isDepositValid,
    handleDeposit,
    transactionStatus,
    transactionHash,
    transactionError,
    resetTransaction,
  } = useInvest();

  const isProcessing =
    transactionStatus === TransactionStatus.PREPARING ||
    transactionStatus === TransactionStatus.SIGNING ||
    transactionStatus === TransactionStatus.BROADCASTING;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollViewRef}
          className="bg-background"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-6 pt-6">
            {/* Page Title */}
            <Text className="text-text mb-6 text-2xl font-bold">Invest in StepFi</Text>

            {/* Investment Card */}
            <View
              className="mb-4 rounded-2xl bg-white p-6 shadow-sm"
              accessibilityRole="summary"
              accessibilityLabel="Your investment summary">
              <View className="mb-4 flex-row items-center gap-2">
                <View className="bg-purpleSoft h-10 w-10 items-center justify-center rounded-full">
                  <Ionicons name="trending-up" size={20} color={colors.purple} />
                </View>
                <Text className="text-base font-medium text-textSecondary">Your Investment</Text>
              </View>

              {/* Total Invested */}
              <View className="mb-4">
                <Text className="text-textSubtle mb-1 text-sm">Total Invested</Text>
                <Text className="text-textStrong text-5xl font-bold">$1,250.00</Text>
              </View>

              {/* Earnings */}
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-textSubtle text-sm">Earnings</Text>
                <Text className="text-base font-semibold text-success">+$42.30</Text>
              </View>

              {/* Progress Line */}
              <View className="mb-4 h-1 rounded-full bg-success" />

              {/* APY and Return Rate Row */}
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-textSubtle mb-1 text-sm">Estimated APY</Text>
                  <Text className="text-textStrong text-3xl font-bold">5.2%</Text>
                </View>
                <View className="items-end">
                  <Text className="text-textSubtle mb-1 text-sm">Return Rate</Text>
                  <Text className="text-base font-semibold text-success">+3.4%</Text>
                </View>
              </View>
            </View>

            {/* Fund Overview Card */}
            <View
              className="mb-4 rounded-2xl bg-white p-6 shadow-sm"
              accessibilityRole="summary"
              accessibilityLabel="Fund overview information">
              <View className="mb-4 flex-row items-center gap-2">
                <View className="bg-successSoft h-10 w-10 items-center justify-center rounded-full">
                  <Text className="text-xl font-bold text-success">$</Text>
                </View>
                <Text className="text-base font-medium text-textSecondary">Fund Overview</Text>
              </View>

              {/* Pool Size */}
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-textSubtle text-sm">Pool Size</Text>
                <Text className="text-textStrong text-base font-semibold">$48,320</Text>
              </View>

              {/* Active Loans */}
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-textSubtle text-sm">Active Loans</Text>
                <Text className="text-textStrong text-base font-semibold">36</Text>
              </View>

              {/* Risk Level */}
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-textSubtle text-sm">Risk Level</Text>
                <View className="bg-successSoft rounded-full px-3 py-1">
                  <Text className="text-xs font-semibold text-success">Low</Text>
                </View>
              </View>

              {/* Disclaimer Text */}
              <Text className="text-textSubtle mt-1 text-xs">
                Returns depend on borrower behavior
              </Text>
            </View>

            {/* Deposit Card */}
            <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-textStrong mb-4 text-xl font-bold">Deposit Funds</Text>

              {/* Amount Input Field */}
              <View className="mb-4">
                <Text className="text-textSubtle mb-2 text-sm">Amount to invest</Text>
                <TextInput
                  className="text-textStrong mb-2 text-5xl font-bold"
                  keyboardType="numeric"
                  value={depositAmount ? `$${depositAmount}` : ''}
                  onChangeText={handleAmountChange}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 600, animated: true });
                    }, 150);
                  }}
                  placeholder="$0.00"
                  placeholderTextColor={colors.placeholderAlt}
                  accessibilityLabel="Amount to invest input field"
                  accessibilityHint="Enter the amount you want to invest, minimum $10"
                />
                <Text className="text-textSubtle text-xs">Minimum deposit $10</Text>
              </View>

              {/* Transaction Feedback */}
              {transactionStatus === TransactionStatus.ERROR && transactionError && (
                <View className="mb-3 rounded-xl bg-red-50 p-3">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-red-700">Transaction failed</Text>
                      <Text className="mt-1 text-xs text-red-600">{transactionError.message}</Text>
                      <TouchableOpacity onPress={resetTransaction} className="mt-2">
                        <Text className="text-xs font-semibold text-red-700 underline">
                          Dismiss
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {transactionStatus === TransactionStatus.SUCCESS && transactionHash && (
                <View className="mb-3 rounded-xl bg-green-50 p-3">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-green-700">
                        Deposit successful
                      </Text>
                      <Text className="mt-1 font-mono text-xs text-green-600">
                        TX: {transactionHash.slice(0, 16)}...
                      </Text>
                      <TouchableOpacity onPress={resetTransaction} className="mt-2">
                        <Text className="text-xs font-semibold text-green-700 underline">
                          Make another deposit
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Deposit Button */}
              <TouchableOpacity
                className={`items-center rounded-2xl py-4 ${
                  isDepositValid() && !isProcessing ? 'bg-ctaStrong' : 'bg-cta'
                }`}
                onPress={handleDeposit}
                disabled={!isDepositValid() || isProcessing}
                accessibilityLabel="Deposit funds button"
                accessibilityState={{ disabled: !isDepositValid() || isProcessing }}
                accessibilityHint={!isDepositValid() ? 'Minimum $10 required' : undefined}>
                {isProcessing ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-base font-semibold text-white">Processing...</Text>
                  </View>
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      isDepositValid() ? 'text-white' : 'text-gray-200'
                    }`}>
                    Deposit funds
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View
              className="bg-infoSoft flex-row items-start rounded-2xl p-4"
              accessibilityRole="text"
              accessibilityLabel="Important investment information">
              <View className="bg-info mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full">
                <Ionicons name="information" size={14} color={colors.white} />
              </View>
              <Text className="flex-1 text-sm text-textSecondary">
                Funds are used to finance BNPL purchases. Returns are not guaranteed.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InvestScreen;
