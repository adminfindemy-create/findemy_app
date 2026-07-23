import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useRespondReview, useStudioReviews } from '@/hooks/useStudioQueries';
import { Button, IconHelp, sansFor, useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ReviewRespondScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useStudioReviews();
  const review = data?.items.find((reviewItem) => reviewItem.id === id);
  const [response, setResponse] = useState('');
  const respond = useRespondReview();

  const firstName = review?.student_name?.split(' ')[0] ?? 'there';
  const toneChips: { label: string; text: string }[] = [
    {
      label: 'Thank them',
      text: `Thank you so much, ${firstName}! We're thrilled you enjoyed the class and can't wait to see you again. 🙏`,
    },
    {
      label: 'Apologize',
      text: `Hi ${firstName}, we're really sorry your experience fell short. We'd love to make it right — please reach out so we can help.`,
    },
    {
      label: 'Explain',
      text: `Thanks for the feedback, ${firstName}. Here's some context on what happened, and what we're doing to improve…`,
    },
    {
      label: 'Invite back',
      text: `Thank you, ${firstName}! We'd love to have you back — your next session is on us. See you soon!`,
    },
  ];

  const onSubmit = async () => {
    try {
      await respond.mutateAsync({ id, response });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit your response. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Respond to review" showBack />} bottomTab={null}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={theme.color.persimmon} />
        </View>
      </Screen>
    );
  }

  if (!review) {
    return (
      <Screen header={<ScreenHeader title="Respond to review" showBack />} bottomTab={null}>
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>
            Review not found.
          </Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </Screen>
    );
  }

  const meta = [
    review.batch_title,
    review.session_count ? `${review.session_count} sessions` : null,
    review.created_at
      ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen
      header={<ScreenHeader title="Respond to review" showBack />}
      bottomTab={null}
      scroll
      footer={
        <Button
          variant="dark"
          block
          onPress={onSubmit}
          disabled={response.length === 0 || response.length > 500}
          loading={respond.isPending}
        >
          Post reply
        </Button>
      }
    >
      <View style={styles.container}>
        {/* Review recap (.policy) */}
        <View style={[styles.policy, { backgroundColor: theme.color.paperWarm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>
              {review.student_name}
            </Text>
            <Text style={{ color: theme.color.marigold, fontSize: 13 }}>
              {'★'.repeat(Math.round(review.rating))}
              {'☆'.repeat(5 - Math.round(review.rating))}
            </Text>
          </View>
          {meta ? (
            <Text
              style={{
                fontFamily: sansFor(600),
                fontSize: 11.5,
                color: theme.color.whisper,
                marginTop: 2,
              }}
            >
              {meta}
            </Text>
          ) : null}
          {review.comment ? (
            <Text
              style={{
                fontFamily: theme.font.serifItalic,
                fontSize: 14,
                color: theme.color.ink,
                marginTop: 10,
                lineHeight: 20,
              }}
            >
              “{review.comment}”
            </Text>
          ) : null}
        </View>

        {/* Tone chips */}
        <View style={styles.chips}>
          {toneChips.map((chip) => (
            <Pressable
              key={chip.label}
              onPress={() => setResponse(chip.text)}
              style={[
                styles.chip,
                { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
              ]}
            >
              <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.inkSoft }}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Composer */}
        <TextInput
          value={response}
          onChangeText={setResponse}
          multiline
          maxLength={500}
          placeholder="Write a thoughtful reply…"
          placeholderTextColor={theme.color.mist}
          style={[
            styles.textarea,
            {
              backgroundColor: theme.color.ivory,
              borderColor: theme.color.hairline,
              color: theme.color.ink,
              fontFamily: theme.font.sans,
            },
          ]}
        />
        <Text
          style={{
            textAlign: 'right',
            color: theme.color.mist,
            fontFamily: theme.font.sans,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {response.length}/500
        </Text>

        {/* Notice */}
        <View style={[styles.notice, { backgroundColor: theme.color.marigoldSoft }]}>
          <IconHelp size={18} color={theme.color.marigold} />
          <Text
            style={{
              fontFamily: sansFor(600),
              fontSize: 12,
              color: theme.color.inkSoft,
              flex: 1,
              lineHeight: 17,
            }}
          >
            A calm, specific reply to a low rating reassures future learners.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  policy: { borderRadius: 16, padding: 14, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderRadius: 999, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 16 },
  textarea: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 130,
    textAlignVertical: 'top',
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 14,
    padding: 13,
    marginTop: 12,
  },
});
