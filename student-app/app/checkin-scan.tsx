import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens, useTheme, IconX, IconCheck } from "@findemy/ui";
import { ApiError } from "@findemy/types";
import { useCheckin } from "@/hooks/useCheckin";

// S3.2: in-studio check-in. The real screen opens the camera (expo-camera `CameraView`
// with `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}`) and calls `submit(data)` from
// its onBarcodeScanned. The data flow (scanned token → /attendance/checkin) is wired below;
// swap the viewfinder placeholder for the live CameraView when building on a device.
export default function CheckinScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const checkin = useCheckin();
  const { class_name, academy_name } = useLocalSearchParams<{ class_name?: string; academy_name?: string }>();
  const [done, setDone] = useState<string | null>(null);

  const submit = async (token: string) => {
    try {
      const res = await checkin.mutateAsync(token);
      setDone(res.batch_title);
    } catch {
      // error surfaced below via checkin.error
    }
  };

  const errorCode = checkin.error instanceof ApiError ? checkin.error.code : null;

  if (done) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.color.ink }]}>
        <View style={styles.center}>
          <View style={[styles.tick, { backgroundColor: theme.color.jade }]}>
            <IconCheck size={40} color="#fff" />
          </View>
          <Text style={[styles.heading, { color: "#fff", marginTop: 18 }]}>You're marked present</Text>
          <Text style={[styles.sub, { marginTop: 6 }]}>{done}</Text>
          <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: theme.color.jade }]}>
            <Text style={styles.btnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#14110F" }]}>
      <View style={styles.body}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close">
            <IconX size={20} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Scan to check in</Text>
          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.intro}>
          Point your camera at the check-in QR on the academy's screen to mark today's attendance.
        </Text>

        {/* Viewfinder */}
        <View style={styles.viewWrap}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <View style={styles.scanLine} />
          </View>
        </View>

        {(class_name || academy_name) ? (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            {class_name ? <Text style={styles.className}>{class_name}</Text> : null}
            <Text style={styles.classSub}>{academy_name ? `${academy_name} · ` : ""}today's session</Text>
          </View>
        ) : null}

        {errorCode ? (
          <Text style={[styles.err, { color: theme.color.persimmon }]}>
            {errorCode === "NOT_ENROLLED" ? "You're not enrolled in this class." : "Invalid or expired code."}
          </Text>
        ) : null}

        <View style={{ flex: 1, minHeight: 18 }} />

        <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
          <Text style={styles.btnText}>Cancel</Text>
        </Pressable>
        <Text style={styles.hint}>Trouble scanning? Ask your coach to check you in.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontFamily: tokens.font.sans, fontSize: 17, fontWeight: "800", color: "#fff" },
  intro: { fontFamily: tokens.font.sans, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.66)", textAlign: "center", marginTop: 6, paddingHorizontal: 18 },
  viewWrap: { alignItems: "center", marginTop: 30 },
  viewfinder: { width: 240, height: 240, borderRadius: 24, position: "relative", overflow: "hidden" },
  corner: { position: "absolute", width: 34, height: 34, borderColor: "#fff" },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 24 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 24 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 24 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 24 },
  scanLine: { position: "absolute", top: "50%", left: 12, right: 12, height: 2, backgroundColor: "rgba(236,90,43,0.85)" },
  className: { fontFamily: tokens.font.sans, fontSize: 16, fontWeight: "800", color: "#fff" },
  classSub: { fontFamily: tokens.font.sans, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  err: { fontFamily: tokens.font.sans, fontSize: 14, textAlign: "center", marginTop: 16 },
  heading: { fontFamily: tokens.font.sans, fontSize: 22, fontWeight: "700", textAlign: "center" },
  sub: { fontFamily: tokens.font.sans, fontSize: 14, textAlign: "center", color: "rgba(255,255,255,0.6)" },
  tick: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  btn: { paddingVertical: 15, borderRadius: 999, alignItems: "center", marginTop: 8 },
  btnText: { fontFamily: tokens.font.sans, fontSize: 15, fontWeight: "700", color: "#fff" },
  hint: { fontFamily: tokens.font.sans, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 11 },
});
