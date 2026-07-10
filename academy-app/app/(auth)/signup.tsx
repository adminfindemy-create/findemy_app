import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Input, Button, Chip } from '@findemy/ui';
import { AuthScaffold, AuthHeading, AuthSub } from '@/components/AuthScaffold';
import { api } from '@/lib/api';
import { useOnboarding } from '@/stores/onboarding';

// Categories the backend/onboarding enum supports. The prototype also renders a
// "Fitness" chip, but Academy category is enumerated music/dance/arts/yoga only —
// omitted here rather than invent an unsupported value.
const CATEGORIES = [
  { key: 'music', label: 'Music' },
  { key: 'dance', label: 'Dance' },
  { key: 'arts', label: 'Arts' },
  { key: 'yoga', label: 'Yoga' },
] as const;

const schema = z.object({
  academyName: z.string().optional(),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  category: z.enum(['music', 'dance', 'arts', 'yoga']).optional(),
});

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setOnboardingMany = useOnboarding((state) => state.setMany);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { academyName: '', phone: '', category: undefined },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.auth.requestOtp({ phone: data.phone, role: 'academy' });
      // Stash whatever basics were supplied so onboarding pre-fills them.
      setOnboardingMany({
        phone: data.phone,
        ...(data.academyName?.trim() ? { academyName: data.academyName.trim() } : {}),
        ...(data.category ? { category: data.category } : {}),
      });
      router.push(`/(auth)/verify-otp?otp_id=${response.otp_id}&phone=${data.phone}&from=signup`);
    } catch (error: any) {
      if (error?.code === 'RATE_LIMITED') {
        setErrorMsg('Too many attempts, try in a few minutes.');
      } else {
        setErrorMsg(error?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 8 }}>
        <AuthHeading>List your academy.</AuthHeading>
        <AuthSub>A few basics to get started — you can complete your profile after.</AuthSub>
      </View>

      <View style={{ marginTop: 24, gap: 16 }}>
        <Controller
          control={control}
          name="academyName"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Academy name"
              placeholder="e.g. The Rhythm House"
              value={value ?? ''}
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
              prefix={
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.inkSoft }}>
                  +91
                </Text>
              }
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={value}
              onChangeText={(digits) => onChange(digits.replace(/\D/g, '').slice(0, 10))}
              error={error?.message}
            />
          )}
        />

        <View>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.inkSoft, marginBottom: 10 }}>
            Primary category
          </Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category.key}
                    label={category.label}
                    selected={value === category.key}
                    onPress={() => onChange(category.key)}
                  />
                ))}
              </View>
            )}
          />
        </View>
      </View>

      {errorMsg ? (
        <Text style={{ color: theme.color.rose, fontFamily: theme.font.sans, fontSize: 13, marginTop: 12 }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 22 }}>
        <Button block variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
          Send OTP
        </Button>
      </View>

      <View style={{ marginTop: 22, alignItems: 'center' }}>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
          Already listed?{' '}
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
