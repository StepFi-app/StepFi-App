import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface FallbackProps {
  resetError: () => void;
}

function ErrorFallback({ resetError }: FallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred. Our team has been notified.
      </Text>
      <Pressable style={styles.button} onPress={resetError}>
        <Text style={styles.buttonText}>Reload App</Text>
      </Pressable>
    </View>
  );
}

interface Props {
  children: React.ReactNode;
}

export function SentryErrorBoundary({ children }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080F1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
