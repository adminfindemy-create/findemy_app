import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Input, Button, Chip } from '@findemy/ui';
import type { AcademyAccount, Academy } from '@findemy/types';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useOnboarding } from '@/stores/onboarding';
import { AuthScaffold, AuthHeading, AuthSub, Em } from '@/components/auth/AuthScaffold';

const CATEGORIES = [
  { key: 'music', label: 'Music' },
  { key: 'dance', label: 'Dance' },
  { key: 'arts', label: 'Arts' },
  { key: 'yoga', label: 'Yoga' },
] as const;

// S0.3: academy's offered delivery modes (distinct from a batch's mode).
const MODES = [
  { key: 'in_studio', label: 'In-studio' },
  { key: 'online', label: 'Online' },
  { key: 'home_visit', label: 'Home visit' },
] as const;

const schema = z.object({
  ownerName: z.string().min(1, 'Owner name is required'),
  academyName: z.string().min(1, 'Academy name is required'),
  city: z.string().min(1, 'City is required'),
  category: z.enum(['music', 'dance', 'arts', 'yoga'], {
    errorMap: () => ({ message: 'Pick a category' }),
  }),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  modesOffered: z
    .array(z.enum(['in_studio', 'online', 'home_visit']))
    .min(1, 'Pick at least one mode'),
  tagline: z.string().max(120).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

function coerceAccount(raw: Record<string, unknown> | undefined): AcademyAccount {
  const ownerName =
    (raw?.ownerName as string | undefined) ??
    (raw?.owner_name as string | undefined) ??
    null;
  const academyId =
    (raw?.academyId as string | undefined) ??
    (raw?.academy_id as string | undefined) ??
    null;
  return {
    id: String(raw?.id ?? ''),
    phone: raw?.phone ? String(raw.phone) : null,
    academyId: academyId ? String(academyId) : null,
    ownerName: ownerName ? String(ownerName) : null,
    email: raw?.email ? String(raw.email) : null,
  };
}

function coerceAcademy(raw: Record<string, unknown> | undefined): Academy {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    category: (raw?.category as any) ?? 'music',
    address: String(raw?.address ?? ''),
    bio: raw?.bio ? String(raw.bio) : undefined,
    lat: raw?.lat ? Number(raw.lat) : undefined,
    lng: raw?.lng ? Number(raw.lng) : undefined,
    rating: raw?.rating ? Number(raw.rating) : undefined,
    images: Array.isArray(raw?.images) ? (raw?.images as string[]) : undefined,
  };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const account = useAuth((state) => state.account);
  const onboardingStore = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Render-time guard: an unauthenticated visit must bounce to the auth root
  // BEFORE the form's submit can 401. Wait for SecureStore rehydration first.
  useEffect(() => {
    const { _hasHydrated, accessToken } = useAuth.getState();
    if (_hasHydrated && !accessToken) {
      router.replace('/(auth)');
    }
  }, [router]);

  const defaultOwnerName = onboardingStore.ownerName || account?.ownerName || '';
  const defaultPhone = onboardingStore.phone || account?.phone || '';
  const defaultCategory = (onboardingStore.category || '') as FormData['category'] | '';

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerName: defaultOwnerName,
      academyName: onboardingStore.academyName,
      city: onboardingStore.city,
      // Let zod's enum reject '' so the radio is genuinely required.
      // Cast through unknown to satisfy RHF's typed defaults.
      category: (defaultCategory || ('' as unknown as FormData['category'])),
      phone: defaultPhone,
      modesOffered: [],
      tagline: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.academy.completeOnboarding({
        ownerName: data.ownerName,
        academyName: data.academyName,
        city: data.city,
        category: data.category,
        phone: data.phone,
        modesOffered: data.modesOffered,
        tagline: data.tagline || undefined,
      });

      const { accessToken, refreshToken } = useAuth.getState();
      if (!accessToken || !refreshToken) {
        // Should never happen — guard protects the screen — but be defensive.
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/(auth)');
        return;
      }

      useAuth.getState().setAuth({
        access: accessToken,
        refresh: refreshToken,
        account: coerceAccount(response.account),
        academy: coerceAcademy(response.academy),
      });

      // Clear the cached onboarding draft on success.
      onboardingStore.clear();
      router.replace('/(tabs)/studio');
    } catch (error: any) {
      setErrorMsg(error?.message ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const headingName = (onboardingStore.academyName || '').trim() || 'your studio';

  return (
    <AuthScaffold>
      <View style={{ marginTop: 8 }}>
        <AuthHeading size={30}>
          Tell learners about <Em>{headingName}</Em>.
        </AuthHeading>
        <AuthSub>This is what students see when they discover you.</AuthSub>
      </View>

      <View style={{ marginTop: 24, gap: 16 }}>
        <Controller
          control={control}
          name="academyName"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Academy name"
              placeholder="e.g. The Rhythm House"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                onboardingStore.setField('academyName', text);
              }}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="ownerName"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Owner name"
              placeholder="Your name"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                onboardingStore.setField('ownerName', text);
              }}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Location / area"
              placeholder="e.g. Hauz Khas, Delhi"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                onboardingStore.setField('city', text);
              }}
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
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <View>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((category) => (
                    <Chip
                      key={category.key}
                      label={category.label}
                      selected={value === category.key}
                      onPress={() => {
                        onChange(category.key);
                        onboardingStore.setField('category', category.key);
                      }}
                    />
                  ))}
                </View>
                {error?.message ? (
                  <Text style={{ color: theme.color.rose, fontSize: 13, marginTop: 6 }}>{error.message}</Text>
                ) : null}
              </View>
            )}
          />
        </View>

        <View>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.inkSoft, marginBottom: 10 }}>
            Modes offered
          </Text>
          <Controller
            control={control}
            name="modesOffered"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <View>
                <View style={styles.chipRow}>
                  {MODES.map((mode) => {
                    const active = (value ?? []).includes(mode.key);
                    return (
                      <Chip
                        key={mode.key}
                        label={mode.label}
                        selected={active}
                        onPress={() =>
                          onChange(
                            active
                              ? (value ?? []).filter((modeKey) => modeKey !== mode.key)
                              : [...(value ?? []), mode.key]
                          )
                        }
                      />
                    );
                  })}
                </View>
                {error?.message ? (
                  <Text style={{ color: theme.color.rose, fontSize: 13, marginTop: 6 }}>{error.message}</Text>
                ) : null}
              </View>
            )}
          />
        </View>

        <Controller
          control={control}
          name="tagline"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Tagline"
              placeholder="A warm, gear-rich space for guitar, keys & vocals."
              value={value ?? ''}
              onChangeText={onChange}
              maxLength={120}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Contact phone"
              keyboardType="number-pad"
              maxLength={10}
              value={value}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 10);
                onChange(digits);
                onboardingStore.setField('phone', digits);
              }}
              error={error?.message}
              prefix={
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.inkSoft }}>
                  +91
                </Text>
              }
            />
          )}
        />
      </View>

      {errorMsg ? (
        <Text style={{ color: theme.color.rose, fontFamily: theme.font.sans, fontSize: 13, marginTop: 12 }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 22 }}>
        <Button block variant="dark" loading={loading} onPress={handleSubmit(onSubmit)}>
          Save & open dashboard
        </Button>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
