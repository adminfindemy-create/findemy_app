import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Button, ActionBar } from "@findemy/ui";
import { ApiError } from "@findemy/types";
import { useCreateReview } from "@/hooks/useCreateReview";
import { ScreenHeader } from "@/components/common/ScreenHeader";

// S4.3: leave one review per academy, from an attended trial or an enrolment. No decision step.
// Params: academy_id, source ('trial'|'enrollment'), batch_id, trial_id?, academy_name?
export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    academy_id: string;
    source: "trial" | "enrollment";
    batch_id: string;
    trial_id?: string;
    academy_name?: string;
  }>();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (rating < 1) return;
    await createReview.mutateAsync({
      academy_id: params.academy_id,
      source: params.source,
      batch_id: params.batch_id,
      trial_id: params.source === "trial" ? params.trial_id : undefined,
      rating,
      comment: note.trim() || undefined,
    });
    router.back();
  };

  const errorCode = createReview.error instanceof ApiError ? createReview.error.code : null;
  const errorMsg =
    errorCode === "ALREADY_REVIEWED"
      ? "You've already reviewed this academy."
      : errorCode === "NOT_ELIGIBLE"
        ? "You can review only after a trial or while enrolled here."
        : createReview.isError
          ? "Couldn't post your review. Try again."
          : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Rate your experience" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {params.academy_name ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist }}>{params.academy_name}</Text>
        ) : null}

        {/* Stars */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 28, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} star${star === 1 ? "" : "s"}`}
              accessibilityState={{ selected: star <= rating }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 40, color: star <= rating ? theme.color.marigold : theme.color.hairline }}>★</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          placeholderTextColor={theme.color.mist}
          multiline
          maxLength={1000}
          style={{
            marginTop: 28,
            minHeight: 110,
            borderWidth: 1,
            borderColor: theme.color.hairline,
            borderRadius: 14,
            padding: 14,
            fontFamily: theme.font.sans,
            fontSize: 15,
            color: theme.color.ink,
            textAlignVertical: "top",
          }}
        />

        {errorMsg ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.persimmon, marginTop: 14 }}>{errorMsg}</Text>
        ) : null}
      </ScrollView>

      <ActionBar bottomInset={insets.bottom}>
        <Button onPress={submit} disabled={rating < 1} loading={createReview.isPending} block>
          Post review
        </Button>
      </ActionBar>
    </SafeAreaView>
  );
}
