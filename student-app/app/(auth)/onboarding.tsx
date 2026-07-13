import React, { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme, Input, Button } from "@findemy/ui";
import { AuthScaffold, AuthHeading, AuthSub, Em } from "@/components/auth/AuthScaffold";
import { api } from "@/lib/api";
import { useOnboarding } from "@/stores/onboarding";
import { useAuth } from "@/stores/auth";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z
    .string()
    .min(1, "Age is required")
    .regex(/^\d+$/, "Enter a whole number")
    .refine((v) => Number(v) >= 5 && Number(v) <= 120, "Enter a valid age"),
  location: z.string().min(1, "Location is required"),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const store = useOnboarding();
  const setUser = useAuth((state) => state.setUser);
  const userPhone = useAuth((state) => state.user?.phone);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: store.name,
      age: store.age,
      location: store.location,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg("");
    try {
      await api.me.updateOnboarding({
        name: data.name,
        age: data.age ? Number(data.age) : undefined,
        location: data.location,
        lat: store.lat ?? 0,
        lng: store.lng ?? 0,
        interests: store.interests,
      });
      setUser({ name: data.name, location: data.location, age: data.age ? Number(data.age) : undefined });
      store.setField("name", data.name);
      store.setField("age", data.age ?? "");
      store.setField("location", data.location);
      router.replace("/(auth)/interests");
    } catch {
      setErrorMsg("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 8 }}>
        <AuthHeading size={34}>
          A little <Em>about you</Em>
        </AuthHeading>
        <AuthSub>So we can show academies near you.</AuthSub>
      </View>

      <View style={{ marginTop: 20, gap: 14 }}>
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

        {/* Read-only — the number they just verified. */}
        <Input label="Phone" editable={false} value={userPhone ? `+91 ${userPhone}` : ""} />

        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Age"
              required
              placeholder="e.g. 24"
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Location"
              required
              placeholder="Hauz Khas, Delhi-NCR"
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />
      </View>

      {errorMsg ? (
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.rose, marginTop: 12 }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 24 }}>
        <Button block variant="dark" loading={loading} onPress={handleSubmit(onSubmit)}>
          Save & continue
        </Button>
      </View>
    </AuthScaffold>
  );
}
