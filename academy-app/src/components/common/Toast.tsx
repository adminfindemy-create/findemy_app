import { useTheme } from '@findemy/ui';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastVariant = 'success' | 'error' | 'info';

type ToastState = { message: string; variant: ToastVariant } | null;

type ToastContextType = { show: (message: string, variant?: ToastVariant) => void };

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const genRef = useRef(0);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      opacity.stopAnimation();
      const gen = ++genRef.current;
      setToast({ message, variant });
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          // Only clear if no newer toast has been shown since this one started fading.
          if (genRef.current === gen) setToast(null);
        });
      }, 3000);
    },
    [opacity]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const bg =
    toast?.variant === 'error'
      ? theme.color.persimmon
      : toast?.variant === 'info'
        ? theme.color.ink
        : theme.color.jade;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { top: insets.top + 12, opacity, backgroundColor: bg, shadowColor: theme.color.ink },
          ]}
        >
          <Text style={[styles.text, { fontFamily: theme.font.sans, color: theme.color.ivory }]}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 9999,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
