import React, { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme, Input, Button } from "@findemy/ui";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import * as ImagePicker from "expo-image-picker";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(1, "Location is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
});

type FormData = z.infer<typeof schema>;

function Field({ label, required, children, helper }: { label: string; required?: boolean; children: React.ReactNode; helper?: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: theme.font.sansBold, fontSize: 12.5, color: theme.color.inkSoft, marginBottom: 7 }}>
        {label}
        {required ? <Text style={{ color: theme.color.persimmon }}> *</Text> : null}
      </Text>
      {children}
      {helper ? <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 6 }}>{helper}</Text> : null}
    </View>
  );
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      location: user?.location ?? "",
      email: (user as any)?.email ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg("");
    try {
      await api.me.updateOnboarding({
        name: data.name,
        location: data.location,
        lat: user?.lat ?? 0,
        lng: user?.lng ?? 0,
        interests: (user?.interests ?? []) as any,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.back();
    } catch {
      setErrorMsg("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
    // TODO: upload avatarUri once the profile API accepts an avatar
  };

  const handleChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]?.uri) setAvatarUri(result.assets[0].uri);
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete account", "This will permanently delete your account and all your data. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => Alert.alert("Coming soon", "Account deletion will be available soon.") },
    ]);
  };

  const initial = (user?.name?.trim()?.[0] ?? "S").toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Profile details" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: theme.color.persimmon, borderColor: theme.color.hairline }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 36, color: "#fff" }}>{initial}</Text>
            )}
          </View>
          <Pressable onPress={handleChangePhoto} style={[styles.seeAll, { borderColor: theme.color.hairline, ...theme.shadow.sm }]}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 12.5, color: theme.color.ink }}>Change photo</Text>
          </Pressable>
        </View>

        <Field label="Full name" required>
          <Controller control={control} name="name" render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="Full name" value={value} onChangeText={onChange} error={error?.message} />
          )} />
        </Field>

        <Field label="Email">
          <Controller control={control} name="email" render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="your@email.com" value={value ?? ""} onChangeText={onChange} error={error?.message} />
          )} />
        </Field>

        <Field label="Phone" helper="Contact support to change your number.">
          <View style={[styles.readonly, { borderColor: theme.color.hairline, backgroundColor: theme.color.paperWarm }]}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 16, color: theme.color.mist }}>{user?.phone ?? "—"}</Text>
          </View>
        </Field>

        <Field label="Location">
          <Controller control={control} name="location" render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="Hauz Khas, Delhi-NCR" value={value} onChangeText={onChange} error={error?.message} />
          )} />
        </Field>

        {errorMsg ? <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.rose, marginBottom: 12 }}>{errorMsg}</Text> : null}

        <View style={{ marginTop: 8 }}>
          <Button variant="dark" block loading={loading} onPress={handleSubmit(onSubmit)}>Save changes</Button>
        </View>

        <Pressable onPress={handleDeleteAccount} style={{ alignItems: "center", marginTop: 20, paddingVertical: 8 }}>
          <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.rose }}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: "center", paddingTop: 10, paddingBottom: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  seeAll: { backgroundColor: "#fff", borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12 },
  readonly: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, minHeight: 50, justifyContent: "center" },
});
