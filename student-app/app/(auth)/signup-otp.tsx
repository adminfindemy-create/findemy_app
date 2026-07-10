import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, OTPInput, Button } from "@findemy/ui";
import { AuthScaffold, AuthHeading, AuthSub } from "@/components/AuthScaffold";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useOnboarding } from "@/stores/onboarding";
import { useToast } from "@/components/Toast";

export default function SignupOtpScreen() {
  const router = useRouter();
  const { otp_id, phone, name, age } = useLocalSearchParams<{
    otp_id: string;
    phone: string;
    name?: string;
    age?: string;
  }>();
  const theme = useTheme();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const setAuth = useAuth((s) => s.setAuth);
  const toast = useToast();

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.auth.verifyOtp({ otp_id, code });
      const user = res.user as any;
      setAuth({
        access: res.access_token,
        refresh: res.refresh_token,
        user: {
          id: user?.id ?? "",
          name: user?.name ?? "",
          phone: user?.phone ?? phone,
          age: user?.age,
          location: user?.location,
          lat: user?.lat,
          lng: user?.lng,
          interests: user?.interests ?? [],
        },
        attendanceOtp: res.attendance_otp ?? "",
      });
      if (res.is_new_user) {
        const onboardingStore = useOnboarding.getState();
        if (name) onboardingStore.setField("name", decodeURIComponent(name));
        if (age) onboardingStore.setField("age", age);
        router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      if (e.code === "OTP_INVALID" || e.code === "OTP_EXPIRED") {
        setErrorMsg("Invalid or expired code. Please try again.");
      } else if (e.code === "RATE_LIMITED") {
        setErrorMsg("Too many attempts. Please wait.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(60);
    try {
      await api.auth.requestOtp({ phone, role: "student" });
      toast.show("A new code is on its way.", "success");
    } catch {
      toast.show("Couldn't resend the code. Please try again.", "error");
      setResendTimer(0); // let them retry immediately on failure
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 12 }}>
        <AuthHeading size={34}>Enter the 6-digit code</AuthHeading>
        <AuthSub>Sent to +91 {phone}</AuthSub>
      </View>

      <View style={{ marginTop: 26 }}>
        <OTPInput length={6} value={code} onChange={setCode} autoFocus />
      </View>

      {errorMsg ? (
        <Text style={{ color: theme.color.rose, fontFamily: theme.font.sans, fontSize: 13, marginTop: 12, textAlign: "center" }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 16, alignItems: "center" }}>
        {resendTimer > 0 ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
            Resend code in 0:{String(resendTimer).padStart(2, "0")}
          </Text>
        ) : (
          <Pressable onPress={handleResend} hitSlop={8}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.persimmon }}>
              Resend code
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 24 }}>
        <Button block variant="dark" loading={loading} disabled={code.length !== 6} onPress={handleVerify}>
          Verify
        </Button>
      </View>
    </AuthScaffold>
  );
}
