import React, { useState } from "react";
import { View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@findemy/ui";
import { formatRupees } from "@/lib/format";

type Method = "razorpay" | "card" | "wallet";
const METHODS: { key: Method; label: string; short: string; sub: string; ic: string; available: boolean }[] = [
  { key: "razorpay", label: "UPI / Cards / Netbanking", short: "UPI / Cards / Netbanking", sub: "Razorpay secure checkout", ic: "RZP", available: true },
  { key: "card", label: "Saved card •••• 4821", short: "Card ••4821", sub: "VISA · 11/29", ic: "💳", available: false },
  { key: "wallet", label: "Findemy wallet", short: "Findemy wallet", sub: "₹0 balance", ic: "₹", available: false },
];

// Bottom pay bar: "Pay using ⌄ <method>" selector (opens a methods sheet) + a Total / Pay-now pill.
// Shared across trial, enrolment, workshop and event checkout so the UX is identical.
export function PayFooter({
  totalPaise,
  onPay,
  loading,
  disabled,
  ctaLabel = "Pay now",
}: {
  totalPaise?: number | null;
  onPay: () => void;
  loading?: boolean;
  disabled?: boolean;
  ctaLabel?: string;
}) {
  const theme = useTheme();
  const [method, setMethod] = useState<Method>("razorpay");
  const [showMethods, setShowMethods] = useState(false);
  const selected = METHODS.find((methodOption) => methodOption.key === method) ?? METHODS[0];

  return (
    <>
      <SafeAreaView edges={["bottom"]} style={[styles.footer, { backgroundColor: theme.color.paper, borderTopColor: theme.color.hairline }]}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowMethods(true)} accessibilityRole="button" accessibilityLabel="Change payment method">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12, color: theme.color.mist }}>Pay using</Text>
            <Text style={{ fontSize: 12, color: theme.color.mist }}>▾</Text>
          </View>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink, marginTop: 1 }} numberOfLines={1}>
            {selected.short}
          </Text>
        </Pressable>

        <Pressable
          onPress={onPay}
          disabled={disabled || loading}
          style={[styles.pill, { backgroundColor: theme.color.persimmon, opacity: disabled || loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View>
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: "#fff" }}>
                  {totalPaise != null ? formatRupees(totalPaise) : "—"}
                </Text>
                <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 0.4, textTransform: "uppercase" }}>Total</Text>
              </View>
              <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: "#fff" }}>{ctaLabel} ›</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>

      <Modal visible={showMethods} transparent animationType="slide" onRequestClose={() => setShowMethods(false)}>
        <Pressable style={styles.scrim} onPress={() => setShowMethods(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
          <View style={[styles.handle, { backgroundColor: theme.color.hairline }]} />
          <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink, marginBottom: 16 }}>Pay using</Text>
          {METHODS.map((methodOption) => {
            const sel = method === methodOption.key;
            return (
              <Pressable
                key={methodOption.key}
                onPress={() => {
                  if (!methodOption.available) return;
                  setMethod(methodOption.key);
                  setShowMethods(false);
                }}
                style={[styles.method, { borderColor: sel ? theme.color.persimmon : theme.color.hairline, backgroundColor: "#fff", opacity: methodOption.available ? 1 : 0.5 }]}
              >
                <View style={[styles.methodIc, { backgroundColor: theme.color.paperWarm }]}>
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 11, color: theme.color.ink }}>{methodOption.ic}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14.5, color: theme.color.ink }}>{methodOption.label}</Text>
                  <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>{methodOption.sub}</Text>
                </View>
                {methodOption.available ? (
                  <View style={[styles.radio, { borderColor: sel ? theme.color.persimmon : theme.color.hairline }]}>
                    {sel ? <View style={[styles.radioDot, { backgroundColor: theme.color.persimmon }]} /> : null}
                  </View>
                ) : (
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 10, color: theme.color.whisper, letterSpacing: 0.6, textTransform: "uppercase" }}>Soon</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
  pill: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 18, minWidth: 168 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  method: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10 },
  methodIc: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 11, height: 11, borderRadius: 5.5 },
});
