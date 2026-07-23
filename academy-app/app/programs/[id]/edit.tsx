import { ErrorState } from '@/components/common/ErrorState';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useToast } from '@/components/common/Toast';
import { type MediaItem, MediaPicker } from '@/components/media/MediaPicker';
import { useStudioProgram, useUpdateProgram } from '@/hooks/useStudioQueries';
import { Button, Input, sansFor, useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function EditProgramScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useStudioProgram(id);
  const updateProgram = useUpdateProgram(id);

  const program = data?.program;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [things, setThings] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (program && !seeded) {
      setTitle(program.title ?? '');
      setDescription(program.description ?? '');
      setThings((program.things_to_know ?? []).join('\n'));
      setMedia((program.media ?? []) as MediaItem[]);
      setSeeded(true);
    }
  }, [program, seeded]);

  const onSave = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Program name is required.');
    if (!description.trim()) return Alert.alert('Required', 'A short description is required.');
    if (media.length < 3)
      return Alert.alert('Add media', 'Please keep at least 3 photos or videos.');
    try {
      await updateProgram.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        things_to_know: things
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        media,
      });
      showToast('Program updated', 'success');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update program');
    }
  };

  const fgh = {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: theme.color.whisper,
  };

  return (
    <Screen header={<ScreenHeader title="Edit program" showBack />} bottomTab={null} scroll>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {isLoading ? (
          <Text
            style={{ color: theme.color.mist, fontFamily: theme.font.sans, paddingVertical: 20 }}
          >
            Loading…
          </Text>
        ) : isError || !program ? (
          <ErrorState message="Couldn't load this program." onRetry={refetch} />
        ) : (
          <>
            <Text style={[fgh, { marginBottom: 4 }]}>Photos & videos</Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 12,
                color: theme.color.mist,
                marginBottom: 12,
              }}
            >
              At least 3 (up to 10). Shown at the top of your program.
            </Text>
            <View style={{ marginBottom: 20 }}>
              <MediaPicker value={media} onChange={setMedia} max={10} />
            </View>

            <Text style={[fgh, { marginBottom: 10 }]}>Program name</Text>
            <Input placeholder="e.g. Guitar Lessons" value={title} onChangeText={setTitle} />

            <Text style={[fgh, { marginTop: 18, marginBottom: 10 }]}>About this program</Text>
            <Input
              placeholder="What students will learn, the vibe, who it's for…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[fgh, { marginTop: 18, marginBottom: 4 }]}>Things to know</Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 12,
                color: theme.color.mist,
                marginBottom: 10,
              }}
            >
              One point per line.
            </Text>
            <Input
              placeholder={'Bring your own instrument\nArrive 10 min early'}
              value={things}
              onChangeText={setThings}
              multiline
              numberOfLines={4}
            />

            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 12,
                color: theme.color.mist,
                marginTop: 16,
                lineHeight: 18,
              }}
            >
              Category can't be changed after creation. Batches are edited from each batch.
            </Text>

            <Button
              variant="primary"
              block
              style={{ marginTop: 20 }}
              loading={updateProgram.isPending}
              onPress={onSave}
            >
              Save changes
            </Button>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const _styles = StyleSheet.create({});
