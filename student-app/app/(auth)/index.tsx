import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Platform, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useTheme, BlockPrintCover, Button } from "@findemy/ui";
import { Em } from "@/components/AuthScaffold";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import type { User } from "@/stores/auth";
import { useOnboarding } from "@/stores/onboarding";
import { nextOnboardingStep } from "@/lib/onboarding";

// Lazy-required so the JS bundle doesn't crash if the native module isn't linked
// (e.g. running in Expo Go, or before a dev-client rebuild).
let GoogleSignin: any = null;
let googleStatusCodes: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@react-native-google-signin/google-signin");
  GoogleSignin = mod.GoogleSignin;
  googleStatusCodes = mod.statusCodes;
} catch {
  GoogleSignin = null;
  googleStatusCodes = null;
}

function configureGoogleSignin() {
  if (!GoogleSignin) return false;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID; // android uses webClientId
  if (!iosClientId && !webClientId) return false;
  try {
    GoogleSignin.configure({
      iosClientId,
      webClientId,
      scopes: ["email", "profile"],
    });
    return true;
  } catch {
    return false;
  }
}

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setAuth = useAuth((state) => state.setAuth);
  const setOnboardingMany = useOnboarding((state) => state.setMany);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const googleConfiguredRef = useRef(false);

  useEffect(() => {
    if (!googleConfiguredRef.current) {
      googleConfiguredRef.current = configureGoogleSignin();
    }
  }, []);

  const routeAfterAuth = (user: User | null | undefined, isNewUser: boolean) => {
    const step = nextOnboardingStep(user);
    if (isNewUser || step) {
      router.replace((step ?? "/(auth)/onboarding") as any);
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== "ios") return;
    setAppleLoading(true);
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        Alert.alert("Sign in failed", "Apple did not return an identity token.");
        return;
      }

      // Apple only returns fullName on the very first sign-in. Stash it locally
      // so the onboarding screen can pre-fill — backend won't get it from the JWT.
      const given = credential.fullName?.givenName ?? "";
      const family = credential.fullName?.familyName ?? "";
      const composedName = `${given} ${family}`.trim();
      if (composedName) {
        setOnboardingMany({ name: composedName });
      }

      const response = await api.auth.oauthApple({
        idToken: credential.identityToken,
        nonce: rawNonce,
        role: "student",
      });

      const user = (response.user as User | undefined) ?? null;
      setAuth({
        access: response.access_token,
        refresh: response.refresh_token,
        user: user as User,
        attendanceOtp: response.attendance_otp ?? "",
      });
      routeAfterAuth(user, response.is_new_user);
    } catch (error: any) {
      // Silent on user cancellation
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert(
        "Sign in failed",
        error?.message ?? "Couldn't sign in with Apple. Try again or use phone."
      );
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        "Google Sign-In unavailable",
        "Native module not linked. Rebuild the dev client after `pnpm install`."
      );
      return;
    }
    if (!googleConfiguredRef.current) {
      googleConfiguredRef.current = configureGoogleSignin();
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      // SDK v14 returns { type: 'success', data: { idToken, user } } | { type: 'cancelled' }
      if (result?.type === "cancelled") return;
      const idToken: string | undefined = result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        Alert.alert("Sign in failed", "Google did not return an idToken.");
        return;
      }

      const response = await api.auth.oauthGoogle({
        idToken,
        role: "student",
      });

      const user = (response.user as User | undefined) ?? null;
      setAuth({
        access: response.access_token,
        refresh: response.refresh_token,
        user: user as User,
        attendanceOtp: response.attendance_otp ?? "",
      });
      routeAfterAuth(user, response.is_new_user);
    } catch (error: any) {
      const code = error?.code;
      // Silent on user cancellation / in-progress
      if (
        googleStatusCodes &&
        (code === googleStatusCodes.SIGN_IN_CANCELLED ||
          code === googleStatusCodes.IN_PROGRESS)
      ) {
        return;
      }
      Alert.alert(
        "Sign in failed",
        error?.message ?? "Couldn't sign in with Google. Try again or use phone."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Wordmark */}
        <Text style={[styles.wordmark, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
          Findemy
        </Text>

        {/* Hero copy */}
        <Text style={[styles.hero, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
          Begin your <Em>art journey</Em>.
        </Text>
        <Text style={[styles.sub, { fontFamily: theme.font.sans, color: theme.color.mist }]}>
          Find local academies for music, dance, art & yoga. Book a trial, then enrol.
        </Text>

        {/* Category art grid (block-print covers) */}
        <View style={styles.catGrid}>
          {(["music", "dance", "arts", "yoga"] as const).map((cat, index) => (
            <View key={cat} style={styles.catTile}>
              <BlockPrintCover
                category={cat}
                variant={(index + 1) as 1 | 2 | 3 | 4}
                height={96}
                hideLetter
                style={{ width: "100%", height: 96, borderRadius: 20, overflow: "hidden" }}
              >
                <View style={{ position: "absolute", bottom: 11, left: 13 }}>
                  <Text
                    style={{
                      fontFamily: theme.font.sans,
                      fontWeight: "800",
                      fontSize: 16,
                      color: "#fff",
                      textShadowColor: "rgba(0,0,0,0.5)",
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 8,
                    }}
                  >
                    {cat[0].toUpperCase() + cat.slice(1)}
                  </Text>
                </View>
              </BlockPrintCover>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* Action buttons */}
        <View style={{ gap: 11 }}>
          <Button
            block
            variant="ghost"
            disabled={googleLoading}
            onPress={handleGoogle}
            icon={<Text style={{ fontSize: 15, fontFamily: theme.font.sansBold }}>G</Text>}
          >
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </Button>

          {Platform.OS === "ios" ? (
            <Button
              block
              variant="ghost"
              disabled={appleLoading}
              onPress={handleApple}
              icon={<Text style={{ fontSize: 16, color: theme.color.ink }}></Text>}
            >
              {appleLoading ? "Signing in…" : "Continue with Apple"}
            </Button>
          ) : null}

          <Button
            block
            variant="primary"
            onPress={() => router.push("/(auth)/login")}
            icon={<Text style={{ fontSize: 14, color: "#fff" }}>☎</Text>}
          >
            Continue with phone
          </Button>

          <Pressable onPress={() => router.push("/(auth)/signup")} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.inkSoft }}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
  },
  wordmark: {
    fontSize: 30,
    textAlign: "center",
    marginBottom: 20,
  },
  hero: {
    fontSize: 46,
    lineHeight: 46,
    textAlign: "center",
  },
  sub: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
    alignSelf: "center",
    maxWidth: 280,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 28,
  },
  catTile: {
    width: "47.5%",
    flexGrow: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
});
