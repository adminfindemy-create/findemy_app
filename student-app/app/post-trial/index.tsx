import { api } from '@/lib/api';
import { BlockPrintCover, Button, IconStar, IconX, Input, useTheme } from '@findemy/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STAND_OUT_CHIPS = [
  'Patient teacher',
  'Nice space',
  'Good pace',
  'Well prepared',
  'Friendly vibe',
  'Inspiring',
];

const STAR_CAPTIONS: Record<number, string> = {
  0: '',
  1: 'Disappointing',
  2: 'Okay',
  3: 'Good',
  4: 'Great teacher',
  5: 'Loved it',
};

export default function PostTrialReviewScreen() {
  const { trialId, batchTitle, academyId, academyName } = useLocalSearchParams<{
    trialId: string;
    batchTitle: string;
    academyId?: string;
    academyName?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const title = batchTitle ? decodeURIComponent(batchTitle) : 'Trial';
  const academy = academyName ? decodeURIComponent(academyName) : '';

  const submit = useMutation({
    mutationFn: () =>
      api.reviews.create({
        source: 'trial',
        trial_id: trialId,
        rating,
        comment: [tags.join(', '), comment].filter(Boolean).join('\n').trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['trial', trialId] });
      setSubmitted(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to submit review. Please try again.');
    },
  });

  const canSubmit = rating > 0;
  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((existingTag) => existingTag !== tag) : [...prev, tag]
    );

  const goEnroll = () =>
    academyId ? router.replace(`/academy/${academyId}` as any) : router.replace('/(tabs)');

  // ── Done sub-state ──────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={styles.doneHero}>
            <View style={[styles.tick, { backgroundColor: theme.color.persimmon }]}>
              <IconStar size={40} color="#fff" />
            </View>
            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: 34,
                color: theme.color.ink,
                textAlign: 'center',
                marginTop: 18,
                lineHeight: 38,
              }}
            >
              Thanks for the review!
            </Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 14,
                color: theme.color.mist,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              Loved the trial? Enrol and keep going.
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
            ]}
          >
            <BlockPrintCover
              category={'music' as any}
              variant={1}
              height={66}
              hideLetter
              style={styles.thumb}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }}
                numberOfLines={1}
              >
                {title}
              </Text>
              {academy ? (
                <Text
                  style={{
                    fontFamily: theme.font.sansMedium,
                    fontSize: 12.5,
                    color: theme.color.mist,
                    marginTop: 3,
                  }}
                >
                  {academy}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            <Button block onPress={goEnroll}>
              Enrol now
            </Button>
            <Button variant="ghost" block onPress={() => router.replace('/(tabs)')}>
              Maybe later
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Review form ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Close"
          >
            <IconX size={20} color={theme.color.ink} />
          </Pressable>
        </View>

        <Text
          style={{
            fontFamily: theme.font.serif,
            fontSize: 34,
            color: theme.color.ink,
            marginTop: 6,
            marginBottom: 4,
          }}
        >
          How was it?
        </Text>

        {/* Trial card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: '#fff',
              borderColor: theme.color.hairline,
              ...theme.shadow.sm,
              marginTop: 12,
            },
          ]}
        >
          <BlockPrintCover
            category={'music' as any}
            variant={1}
            height={66}
            hideLetter
            style={styles.thumb}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
                <Text
                  style={{
                    fontFamily: theme.font.sansBold,
                    fontSize: 10,
                    color: theme.color.jade,
                    letterSpacing: 0.4,
                  }}
                >
                  Attended
                </Text>
              </View>
              {academy ? (
                <Text
                  style={{
                    fontFamily: theme.font.sansMedium,
                    fontSize: 12.5,
                    color: theme.color.mist,
                  }}
                  numberOfLines={1}
                >
                  {academy}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              style={{ padding: 4 }}
              accessibilityLabel={`${star} stars`}
            >
              <IconStar
                size={38}
                color={star <= rating ? theme.color.persimmon : theme.color.hairline}
              />
            </Pressable>
          ))}
        </View>
        <Text
          style={{
            fontFamily: theme.font.sansMedium,
            fontSize: 13,
            color: theme.color.mist,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {rating > 0 ? `${rating} of 5 · ${STAR_CAPTIONS[rating]}` : 'Tap to rate'}
        </Text>

        {/* Chips */}
        {rating > 0 ? (
          <View style={styles.chipRow}>
            {STAND_OUT_CHIPS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? theme.color.persimmon : '#fff',
                      borderColor: on ? theme.color.persimmon : theme.color.hairline,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: theme.font.sansMedium,
                      fontSize: 13,
                      color: on ? '#fff' : theme.color.inkSoft,
                    }}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Note */}
        <View style={{ marginTop: 18 }}>
          <Text
            style={{
              fontFamily: theme.font.sansMedium,
              fontSize: 13,
              color: theme.color.mist,
              marginBottom: 8,
            }}
          >
            Add a note (optional)
          </Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="What made it special — or not?"
            multiline
          />
        </View>

        <View style={{ marginTop: 22 }}>
          <Button
            variant="dark"
            block
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!canSubmit}
          >
            Submit review
          </Button>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={{ alignItems: 'center', paddingVertical: 14 }}
          >
            <Text
              style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.mist }}
            >
              Skip for now
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  thumb: { width: 66, height: 66, borderRadius: 15, overflow: 'hidden' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  doneHero: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  tick: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
});
