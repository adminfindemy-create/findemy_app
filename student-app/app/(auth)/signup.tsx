import { AuthHeading, AuthKicker, AuthScaffold, AuthSub, Em } from '@/components/auth/AuthScaffold';
import { api } from '@/lib/api';
import { Button, Input, useTheme } from '@findemy/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10).max(10),
  age: z
    .string()
    .regex(/^\d+$/, 'Enter a valid age')
    .transform(Number)
    .refine((n) => n > 0 && n < 120, 'Enter a valid age'),
});

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', age: '' as any },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.auth.requestOtp({ phone: data.phone, role: 'student' });
      router.push(
        `/(auth)/signup-otp?otp_id=${response.otp_id}&phone=${data.phone}&name=${encodeURIComponent(data.name)}&age=${data.age}&is_signup=1`
      );
    } catch (error: any) {
      if (error.code === 'RATE_LIMITED') {
        setErrorMsg('Too many attempts, try in a few minutes.');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <AuthKicker>Get started</AuthKicker>
      <AuthHeading size={38}>
        Create your <Em>account</Em>
      </AuthHeading>
      <AuthSub>Join thousands discovering local arts academies.</AuthSub>

      <View style={{ marginTop: 26, gap: 14 }}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Full name"
              required
              placeholder="e.g. Varun Mehta"
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Phone number"
              required
              prefix={
                <Text
                  style={{
                    fontFamily: theme.font.sansBold,
                    fontSize: 16,
                    color: theme.color.inkSoft,
                  }}
                >
                  +91
                </Text>
              }
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />

        {/* Age — required by the app's signup (prototype collects it at onboarding). */}
        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Age"
              placeholder="18"
              keyboardType="number-pad"
              maxLength={3}
              value={String(value ?? '')}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />
      </View>

      {errorMsg ? (
        <Text
          style={{
            color: theme.color.rose,
            fontFamily: theme.font.sans,
            fontSize: 13,
            marginTop: 12,
          }}
        >
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 20 }}>
        <Button block loading={loading} onPress={handleSubmit(onSubmit)}>
          Send OTP
        </Button>
      </View>

      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
          Already have an account?{' '}
          <Text
            style={{ fontFamily: theme.font.sansBold, color: theme.color.persimmon }}
            onPress={() => router.push('/(auth)/login')}
          >
            Log in
          </Text>
        </Text>
      </View>
    </AuthScaffold>
  );
}
