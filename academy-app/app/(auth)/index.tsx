import { AuthBadge, Em } from '@/components/auth/AuthScaffold';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useOnboarding } from '@/stores/onboarding';
import type { Academy, AcademyAccount } from '@findemy/types';
import { BlockPrintCover, Button, useTheme } from '@findemy/ui';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Lazy-required so the JS bundle doesn't crash if the native module isn't linked
// (e.g. running in Expo Go, or before a dev-client rebuild).
let GoogleSignin: any = null;
let googleStatusCodes: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  googleStatusCodes = mod.statusCodes;
} catch {
  GoogleSignin = null;
  googleStatusCodes = null;
}

function configureGoogleSignin() {
  if (!GoogleSignin) return false;
  // Must match the backend's admin audience (getGoogleAudiences('academy') →
  // GOOGLE_ADMIN_IOS/ANDROID_CLIENT_ID). Generic/student-scoped client IDs would
  // mint idTokens whose `aud` the admin verifier rejects (oauth_audience_mismatch).
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID; // android uses webClientId
  if (!iosClientId && !webClientId) return false;
  try {
    GoogleSignin.configure({
      iosClientId,
      webClientId,
      scopes: ['email', 'profile'],
    });
    return true;
  } catch {
    return false;
  }
}

function coerceAccount(raw: Record<string, unknown> | undefined): AcademyAccount | null {
  if (!raw) return null;
  const ownerName =
    (raw.ownerName as string | undefined) ?? (raw.owner_name as string | undefined) ?? null;
  const academyId =
    (raw.academyId as string | undefined) ?? (raw.academy_id as string | undefined) ?? null;
  return {
    id: String(raw.id ?? ''),
    phone: raw.phone ? String(raw.phone) : null,
    academyId: academyId ? String(academyId) : null,
    ownerName: ownerName ? String(ownerName) : null,
    email: raw.email ? String(raw.email) : null,
  };
}

function coerceAcademy(raw: Record<string, unknown> | undefined): Academy | null {
  if (!raw) return null;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    category: (raw.category as any) ?? 'music',
    address: String(raw.address ?? ''),
    bio: raw.bio ? String(raw.bio) : undefined,
    lat: raw.lat ? Number(raw.lat) : undefined,
    lng: raw.lng ? Number(raw.lng) : undefined,
    rating: raw.rating ? Number(raw.rating) : undefined,
    images: Array.isArray(raw.images) ? (raw.images as string[]) : undefined,
  };
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

  const routeAfterAuth = (academy: Academy | null) => {
    if (academy) {
      router.replace('/(tabs)/studio');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== 'ios') return;
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
        Alert.alert('Sign in failed', 'Apple did not return an identity token.');
        return;
      }

      // Apple only returns fullName on the very first sign-in. Stash it locally
      // so the onboarding screen can pre-fill — backend won't get it from the JWT.
      const given = credential.fullName?.givenName ?? '';
      const family = credential.fullName?.familyName ?? '';
      const composedName = `${given} ${family}`.trim();
      if (composedName) {
        setOnboardingMany({ ownerName: composedName });
      }

      const response = await api.auth.oauthApple({
        idToken: credential.identityToken,
        nonce: rawNonce,
        role: 'academy',
      });

      const account = coerceAccount(response.account);
      const academy = coerceAcademy(response.academy);
      if (!account) {
        Alert.alert('Sign in failed', 'Server returned no account.');
        return;
      }
      setAuth({
        access: response.access_token,
        refresh: response.refresh_token,
        account,
        academy,
      });
      routeAfterAuth(academy);
    } catch (error: any) {
      // Silent on user cancellation (expo-apple-authentication has no error enum;
      // it surfaces cancellation as this string code).
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert(
        'Sign in failed',
        error?.message ?? "Couldn't sign in with Apple. Try again or use phone."
      );
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'Google Sign-In unavailable',
        'Native module not linked. Rebuild the dev client after `pnpm install`.'
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
      if (result?.type === 'cancelled') return;
      const idToken: string | undefined = result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        Alert.alert('Sign in failed', 'Google did not return an idToken.');
        return;
      }

      const response = await api.auth.oauthGoogle({
        idToken,
        role: 'academy',
      });

      const account = coerceAccount(response.account);
      const academy = coerceAcademy(response.academy);
      if (!account) {
        Alert.alert('Sign in failed', 'Server returned no account.');
        return;
      }
      setAuth({
        access: response.access_token,
        refresh: response.refresh_token,
        account,
        academy,
      });
      routeAfterAuth(academy);
    } catch (error: any) {
      const code = error?.code;
      // Silent on user cancellation / in-progress
      if (
        googleStatusCodes &&
        (code === googleStatusCodes.SIGN_IN_CANCELLED || code === googleStatusCodes.IN_PROGRESS)
      ) {
        return;
      }
      Alert.alert(
        'Sign in failed',
        error?.message ?? "Couldn't sign in with Google. Try again or use phone."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Prototype cat-grid: 4 tiles previewing what the studio manages, over the
  // reused category block-print art.
  const TILES = [
    { cat: 'music', label: 'Trials' },
    { cat: 'dance', label: 'Batches' },
    { cat: 'arts', label: 'Students' },
    { cat: 'yoga', label: 'Earnings' },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Wordmark + FOR ACADEMIES badge */}
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <Text style={[styles.wordmark, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
            Findemy
          </Text>
          <View style={{ marginTop: 8 }}>
            <AuthBadge>For academies</AuthBadge>
          </View>
        </View>

        {/* Hero copy */}
        <Text style={[styles.hero, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
          Run your <Em>studio</Em>, fill your classes.
        </Text>
        <Text style={[styles.sub, { fontFamily: theme.font.sans, color: theme.color.mist }]}>
          Get discovered by learners nearby. Manage trials, batches, attendance & enrolments — all
          in one place.
        </Text>

        {/* Category art grid (block-print covers) */}
        <View style={styles.catGrid}>
          {TILES.map((tile, index) => (
            <View key={tile.label} style={styles.catTile}>
              <BlockPrintCover
                category={tile.cat}
                variant={(index + 1) as 1 | 2 | 3 | 4}
                height={90}
                hideLetter
                style={{ width: '100%', height: 90, borderRadius: 18, overflow: 'hidden' }}
              >
                <View style={{ position: 'absolute', bottom: 11, left: 13 }}>
                  <Text
                    style={{
                      fontFamily: theme.font.sansBold,
                      fontSize: 15,
                      letterSpacing: 0.2,
                      color: '#fff',
                      textShadowColor: 'rgba(0,0,0,0.5)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 8,
                    }}
                  >
                    {tile.label}
                  </Text>
                </View>
              </BlockPrintCover>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* Action buttons - OAuth flows preserved, restyled to the button system */}
        <View style={{ gap: 10 }}>
          <Button
            block
            variant="ghost"
            disabled={googleLoading}
            onPress={handleGoogle}
            icon={
              <View style={[styles.gIcon, { borderColor: theme.color.hairline }]}>
                <Text
                  style={{ fontSize: 13, fontFamily: theme.font.sansBold, color: theme.color.ink }}
                >
                  G
                </Text>
              </View>
            }
          >
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </Button>

          {Platform.OS === 'ios' ? (
            <Button
              block
              variant="ghost"
              disabled={appleLoading}
              onPress={handleApple}
              icon={<Text style={{ fontSize: 17, color: theme.color.ink, marginTop: -2 }}></Text>}
            >
              {appleLoading ? 'Signing in…' : 'Continue with Apple'}
            </Button>
          ) : null}

          <Button block variant="primary" onPress={() => router.push('/(auth)/login')}>
            Continue with phone
          </Button>

          {/* Secondary: list-your-academy path, set apart with a hairline rule */}
          <View style={styles.signupRow}>
            <View style={[styles.rule, { backgroundColor: theme.color.hairline }]} />
            <Pressable
              onPress={() => router.push('/(auth)/signup')}
              hitSlop={8}
              style={{ paddingHorizontal: 12, paddingVertical: 4 }}
            >
              <Text
                style={{
                  fontFamily: theme.font.sansSemibold,
                  fontSize: 13.5,
                  color: theme.color.mist,
                }}
              >
                New here?{' '}
                <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.persimmon }}>
                  List your academy
                </Text>
              </Text>
            </Pressable>
            <View style={[styles.rule, { backgroundColor: theme.color.hairline }]} />
          </View>

          <Text style={[styles.terms, { fontFamily: theme.font.sans, color: theme.color.whisper }]}>
            By continuing you agree to Findemy's Partner Terms.
          </Text>
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
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  hero: {
    fontSize: 41,
    lineHeight: 43,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    alignSelf: 'center',
    maxWidth: 290,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 26,
  },
  catTile: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  terms: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  gIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  rule: {
    flex: 1,
    height: 1,
  },
});
