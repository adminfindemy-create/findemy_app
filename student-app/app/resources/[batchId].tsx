import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useResourcesForBatch } from '@/hooks/useResources';
import type { Resource } from '@findemy/types';
import { MenuRow, SectionLabel, Summary, SummaryRow, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FILE_TYPE_LABEL: Record<string, string> = {
  photo: '📷 Photo',
  video: '🎬 Video',
  document: '📄 Document',
};

// M5.2: teacher-uploaded study material — read-only view/download per batch,
// no create (mirrors app/notes/[batchId].tsx's list layout, minus the sheet).
export default function BatchResourcesScreen() {
  const theme = useTheme();
  const { batchId, batch_title, category } = useLocalSearchParams<{
    batchId: string;
    batch_title?: string;
    category?: string;
  }>();
  const enrollments = useEnrollments();
  const resourcesQuery = useResourcesForBatch(batchId);

  const enrollment = useMemo(
    () => (enrollments.data?.items ?? []).find((item: any) => item.batch_id === batchId),
    [enrollments.data, batchId]
  );
  const title = batch_title ?? enrollment?.batch_title ?? 'Resources';
  const categoryValue = category ?? enrollment?.category;

  const resources: Resource[] = (resourcesQuery.data as any)?.items ?? [];

  const openResource = (resource: Resource) => {
    Linking.openURL(resource.url).catch(() =>
      Alert.alert("Couldn't open", "This file couldn't be opened.")
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Resources" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionLabel>Class</SectionLabel>
        <Summary>
          <SummaryRow label="Class" value={title} />
          {categoryValue ? (
            <SummaryRow
              label="Subject"
              value={String(categoryValue).charAt(0).toUpperCase() + String(categoryValue).slice(1)}
              last
            />
          ) : null}
        </Summary>

        <SectionLabel>Study material</SectionLabel>

        {resourcesQuery.isLoading ? (
          <>
            <SkeletonLoader height={64} borderRadius={16} />
            <SkeletonLoader height={64} borderRadius={16} />
          </>
        ) : resourcesQuery.isError ? (
          <ErrorState
            code={(resourcesQuery.error as any)?.code}
            onRetry={() => resourcesQuery.refetch()}
          />
        ) : resources.length === 0 ? (
          <EmptyState message="No resources shared for this class yet." />
        ) : (
          resources.map((resource) => (
            <MenuRow
              key={resource.id}
              title={resource.title}
              sub={[
                FILE_TYPE_LABEL[resource.file_type] ?? resource.file_type,
                format(new Date(resource.created_at), 'd MMM yyyy'),
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => openResource(resource)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },
});
