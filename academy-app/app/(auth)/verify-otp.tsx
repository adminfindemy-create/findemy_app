import { AuthHeading, AuthScaffold, AuthSub } from '@/components/auth/AuthScaffold';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { OtpVerifyRequest } from '@findemy/types';
import { Button, OTPInput, useTheme } from '@findemy/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { otp_id: otpIdParam, phone: phoneParam } = useLocalSearchParams<{
    otp_id: string | string[];
    phone: string | string[];
  }>();
  const otp_id = Array.isArray(otpIdParam) ? otpIdParam[0] : otpIdParam;
  const phone = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam;
  const theme = useTheme();
  const setAuth = useAuth((state) => state.setAuth);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const { control, handleSubmit, formState, setValue } = useForm({
    resolver: zodResolver(OtpVerifyRequest),
    defaultValues: { otp_id: otp_id ?? '', code: '' },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((seconds) => seconds - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const onSubmit = async (data: { otp_id: string; code: string }) => {
    setError('');
    try {
      const response = await api.auth.verifyOtp(data);
      const account = (response as any).account as Record<string, unknown> | undefined;
      const academy = (response as any).academy as Record<string, unknown> | undefined;

      if (!account) {
        // Backend genuinely returned no account record — should be rare since OTP verify
        // is expected to upsert an AcademyAccount. Fall back to support copy.
        setError(
          "We don't have an academy under this number. Talk to Findemy support to get onboarded."
        );
        return;
      }

      const rawAcademyId =
        (account.academyId as string | undefined) ??
        (account.academy_id as string | undefined) ??
        null;
      const accountAcademyId = rawAcademyId ? String(rawAcademyId) : null;
      const rawOwnerName =
        (account.ownerName as string | undefined) ??
        (account.owner_name as string | undefined) ??
        null;
      const normalizedAccount = {
        id: String(account.id ?? ''),
        phone: account.phone ? String(account.phone) : phone ? String(phone) : null,
        academyId: accountAcademyId,
        ownerName: rawOwnerName ? String(rawOwnerName) : null,
        email: account.email ? String(account.email) : null,
      };
      const normalizedAcademy = academy
        ? {
            id: String(academy.id ?? accountAcademyId ?? ''),
            name: String(academy.name ?? rawOwnerName ?? ''),
            category: (academy.category as any) ?? 'music',
            address: String(academy.address ?? ''),
            bio: academy.bio ? String(academy.bio) : undefined,
            lat: academy.lat ? Number(academy.lat) : undefined,
            lng: academy.lng ? Number(academy.lng) : undefined,
            rating: academy.rating ? Number(academy.rating) : undefined,
            images: Array.isArray(academy.images) ? (academy.images as string[]) : undefined,
          }
        : null;

      setAuth({
        access: response.access_token,
        refresh: response.refresh_token,
        account: normalizedAccount,
        academy: normalizedAcademy,
      });

      const fullyOnboarded = !!(academy && accountAcademyId);
      if (fullyOnboarded) {
        router.replace('/(tabs)/studio');
      } else {
        // New account, or returning user whose academy hasn't been created yet.
        router.replace('/(auth)/onboarding');
      }
    } catch (error: any) {
      const code = error.code ?? '';
      if (code === 'OTP_INVALID' || code === 'OTP_EXPIRED') {
        setError(error.message ?? 'Invalid or expired code');
      } else if (code === 'RATE_LIMITED') {
        setError('Too many attempts. Please wait.');
      } else {
        setError(error.message ?? 'Verification failed');
      }
    }
  };

  const onResend = async () => {
    if (resending) return;
    setResending(true);
    setError('');
    try {
      const response = await api.auth.requestOtp({ phone: phone ?? '', role: 'academy' });
      // Backend mints a NEW otp row each request; the freshly-sent code verifies
      // against THIS otp_id, not the original. Re-sync the form and clear the input.
      setValue('otp_id', response.otp_id);
      setValue('code', '');
      setCountdown(60); // only restart the timer once the resend actually succeeded
    } catch (error: any) {
      const code = error?.code ?? '';
      if (code === 'RATE_LIMITED') {
        setError('Too many attempts. Please wait a minute and try again.');
      } else {
        setError(error?.message ?? "Couldn't resend the code. Check your connection.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 8 }}>
        <AuthHeading size={30}>Verify it's you.</AuthHeading>
        <AuthSub>
          Enter the 6-digit code sent to{' '}
          <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.ink }}>
            +91 {phone}
          </Text>
          .
        </AuthSub>
      </View>

      <View style={{ marginTop: 28 }}>
        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <OTPInput length={6} value={value} onChange={onChange} autoFocus />
          )}
        />
      </View>
      {error ? (
        <Text style={{ color: theme.color.rose, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: 24, alignItems: 'center' }}>
        {countdown > 0 ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            Didn't get it? Resend in {countdown}s
          </Text>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onPress={onResend}
            loading={resending}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </Button>
        )}
      </View>

      <View style={{ marginTop: 24 }}>
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={formState.isSubmitting}
          variant="dark"
          block
        >
          Verify
        </Button>
      </View>
    </AuthScaffold>
  );
}
