import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { useTheme, sansFor, Button, AttachmentPicker, type Attachment, type PickedAsset } from '@findemy/ui';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { api, uploadMultipart } from '@/lib/api';

// M5.2: teacher-uploaded study material for this batch. Reuses the shared
// <AttachmentPicker> built for M2.2 (backend/shared/ui/src/components/AttachmentPicker.tsx)
// for file selection, and academy-app's existing `uploadMultipart` helper for
// the actual multipart request — same pattern as MediaPicker.tsx, just posted
// to `/resources/upload` instead of `/studio/media/upload`.
async function uploadResourceAttachment(asset: PickedAsset): Promise<Attachment> {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType,
  } as any);
  return uploadMultipart<Attachment>('/resources/upload', form);
}

function useBatchResources(batchId: string) {
  return useQuery({
    queryKey: ['studio', 'batch', batchId, 'resources'],
    queryFn: () => api.resources.listForBatchAcademy(batchId),
    enabled: !!batchId,
  });
}

export default function BatchResourcesScreen() {
  const theme = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const queryClient = useQueryClient();

  const resourcesQuery = useBatchResources(id);
  const resources = resourcesQuery.data?.items ?? [];

  const [title, setTitle] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['studio', 'batch', id, 'resources'] });

  const createMut = useMutation({
    mutationFn: () =>
      api.resources.create(id, {
        title: title.trim(),
        url: attachment!.url,
        file_type: attachment!.type,
      }),
    onSuccess: () => {
      setTitle('');
      setAttachment(null);
      invalidate();
    },
    onError: (error: any) => {
      Alert.alert('Could not add resource', error?.message ?? 'Please try again.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (resourceId: string) => api.resources.remove(resourceId),
    onSuccess: invalidate,
    onError: (error: any) => {
      Alert.alert('Could not delete', error?.message ?? 'Please try again.');
    },
  });

  const handleAdd = () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please add a title for this resource.');
      return;
    }
    if (!attachment) {
      Alert.alert('File required', 'Please attach a file for this resource.');
      return;
    }
    createMut.mutate();
  };

  const handleDelete = (resourceId: string, resourceTitle: string) => {
    Alert.alert('Delete resource', `Remove "${resourceTitle}" for all students?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(resourceId) },
    ]);
  };

  return (
    <Screen header={<ScreenHeader title="Resources" showBack />} bottomTab={null} scroll>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>Add resource</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={theme.color.mist}
          style={[
            styles.input,
            { fontFamily: sansFor(600), color: theme.color.ink, backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
          ]}
        />
        <AttachmentPicker value={attachment} onChange={setAttachment} onUpload={uploadResourceAttachment} />
        <Button onPress={handleAdd} loading={createMut.isPending} block>
          Add resource
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>Shared with students</Text>
        {resourcesQuery.isLoading ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>Loading…</Text>
        ) : resourcesQuery.isError ? (
          <ErrorState message="Couldn't load resources." onRetry={() => resourcesQuery.refetch()} />
        ) : resources.length === 0 ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            No resources shared for this batch yet.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {resources.map((resource) => (
              <View
                key={resource.id}
                style={[styles.row, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }} numberOfLines={1}>
                    {resource.title}
                  </Text>
                  <Text style={{ fontFamily: sansFor(500), fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
                    {resource.file_type}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(resource.id, resource.title)} hitSlop={8}>
                  <Text style={{ fontFamily: sansFor(700), fontSize: 12.5, color: theme.color.rose }}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 16 },
  sectionLabel: { fontFamily: sansFor(700), fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
