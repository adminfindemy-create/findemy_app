import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Input, Button } from '@findemy/ui';
import { AuthScaffold, AuthHeading, AuthSub, AuthBadge } from '@/components/AuthScaffold';
import { api } from '@/lib/api';

// Matches signup: India 10-digit bare number. The backend looks the account up by
// bare phone, so a loose 8–15-digit shared schema would let mismatched input through.
const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  role: z.literal('academy'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [errorMsg, setErrorMsg] = useState('');
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', role: 'academy' as const },
  });

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const res = await api.auth.requestOtp(data);
      router.push(`/(auth)/verify-otp?otp_id=${res.otp_id}&phone=${data.phone}`);
    } catch (e: any) {
      if (e?.code === 'RATE_LIMITED') {
        setErrorMsg('Too many attempts, try in a few minutes.');
      } else {
        setErrorMsg(e?.message ?? 'Failed to send OTP');
      }
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 8 }}>
        <View style={{ marginBottom: 10 }}>
          <AuthBadge>Studio</AuthBadge>
        </View>
        <AuthHeading>Welcome back.</AuthHeading>
        <AuthSub>Log in with the phone number registered to your academy.</AuthSub>
      </View>

      <View style={{ marginTop: 24 }}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Phone number"
              prefix={
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.inkSoft }}>
                  +91
                </Text>
              }
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={value}
              onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 10))}
              error={error?.message}
            />
          )}
        />
      </View>

      {errorMsg ? (
        <Text style={{ color: theme.color.rose, fontFamily: theme.font.sans, fontSize: 13, marginTop: 8 }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Button block variant="dark" loading={formState.isSubmitting} onPress={handleSubmit(onSubmit)}>
          Get OTP
        </Button>
      </View>

      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
          New to Findemy?{' '}
          <Text
            style={{ fontFamily: theme.font.sansBold, color: theme.color.persimmon }}
            onPress={() => router.push('/(auth)/signup')}
          >
            List your academy
          </Text>
        </Text>
      </View>
    </AuthScaffold>
  );
}
