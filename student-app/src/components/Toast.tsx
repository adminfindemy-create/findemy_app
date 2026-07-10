import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { tokens, useTheme } from "@findemy/ui";
import { useToastBus } from "@/stores/toast";

type ToastVariant = "success" | "error";

type ToastState = {
  message: string;
  variant: ToastVariant;
} | null;

type ToastContextType = {
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, variant: ToastVariant = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, variant });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setToast(null)
      );
    }, 3000);
  }, [opacity]);

  // Bridge: non-component modules enqueue via the zustand bus; surface them here.
  const busRequest = useToastBus((state) => state.request);
  useEffect(() => {
    if (busRequest) show(busRequest.message, busRequest.variant);
  }, [busRequest, show]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const bg = toast?.variant === "error" ? theme.color.persimmon : theme.color.jade;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View style={[styles.container, { opacity, backgroundColor: bg }]}>
          <Text style={[styles.text, { fontFamily: theme.font.sans }]}>{toast.message}</Text>
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
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 9999,
    shadowColor: tokens.shadow.md.shadowColor,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
});
