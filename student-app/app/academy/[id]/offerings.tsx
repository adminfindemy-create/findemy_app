import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SegTabs } from '@/components/common/SegTabs';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { ProgramRowCard } from '@/components/listings/ProgramRowCard';
import { WorkshopRowCard } from '@/components/listings/WorkshopRowCard';
import { useAcademy, useAcademyWorkshops } from '@/hooks/useAcademy';
import { enrichProgram } from '@/lib/programs';
import { useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'programs' | 'workshops';

export default function OfferingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>(tabParam === 'workshops' ? 'workshops' : 'programs');

  const { data, error, isLoading, refetch } = useAcademy(id);
  const { data: workshopsData } = useAcademyWorkshops(id);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
        <ScreenHeader title="All offerings" />
        <View style={{ padding: 18, gap: 12 }}>
          <SkeletonLoader height={102} borderRadius={20} />
          <SkeletonLoader height={102} borderRadius={20} />
          <SkeletonLoader height={102} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
        <ScreenHeader title="All offerings" />
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const workshops = (workshopsData?.items ?? []) as any[];
  const programs = ((data?.programs ?? []) as any[]).map(enrichProgram);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="All offerings" />

      <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
        <SegTabs
          value={tab}
          onChange={setTab}
          options={[
            { key: 'programs', label: `Programs · ${programs.length}` },
            { key: 'workshops', label: `Workshops · ${workshops.length}` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'programs' ? (
          programs.length === 0 ? (
            <EmptyState message="No programs available. Check back soon." />
          ) : (
            programs.map((program) => (
              <ProgramRowCard
                key={program.id}
                program={program}
                onPress={() =>
                  router.push({ pathname: `/program/${program.id}`, params: { academy_id: id } })
                }
              />
            ))
          )
        ) : workshops.length === 0 ? (
          <EmptyState message="No upcoming workshops from this academy." />
        ) : (
          workshops.map((workshop) => (
            <WorkshopRowCard
              key={workshop.id}
              workshop={workshop}
              onPress={() => router.push(`/workshop/${workshop.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
