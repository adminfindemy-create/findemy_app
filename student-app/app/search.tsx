import { AcademyCard } from '@/components/academy/AcademyCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteDiscover } from '@/hooks/useDiscover';
import { useSavedAcademies, useToggleSavedAcademy } from '@/hooks/useSaved';
import { useLocation } from '@/stores/location';
import { IconButton, IconChevL, IconSearch, IconX, useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dedicated search screen, pushed from the Discover tab's search bar (which
// is now just a static-looking trigger, not a real input) — matches the
// pattern most apps use: tap search, transition to a focused full-screen
// search with live results appearing below the input as you type.
export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const trimmedQuery = debouncedQuery.trim();

  const results = useInfiniteDiscover({
    ...location,
    q: trimmedQuery,
    enabled: trimmedQuery.length > 0,
  });
  const { data: savedData } = useSavedAcademies();
  const toggleSave = useToggleSavedAcademy();
  const savedIds = new Set(((savedData as any)?.items ?? []).map((academy: any) => academy.id));
  const items = results.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <View style={styles.topRow}>
        <IconButton
          accessibilityLabel="Back"
          onPress={() => router.back()}
          icon={<IconChevL size={20} color={theme.color.ink} />}
        />
        <View style={[styles.searchPill, { backgroundColor: theme.color.paperWarm }]}>
          <IconSearch size={18} color={theme.color.persimmon} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Find a mentor or studio…"
            placeholderTextColor={theme.color.whisper}
            style={{
              flex: 1,
              fontFamily: theme.font.sans,
              fontSize: 15,
              color: theme.color.ink,
              paddingVertical: 0,
            }}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <IconX size={13} color={theme.color.whisper} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {trimmedQuery.length === 0 ? (
          <View style={styles.prompt}>
            <Text
              style={{
                fontFamily: theme.font.sansMedium,
                fontSize: 14,
                color: theme.color.mist,
                textAlign: 'center',
              }}
            >
              Search for mentors, studios, or classes near you.
            </Text>
          </View>
        ) : results.isLoading ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : results.error ? (
          <ErrorState code={(results.error as any)?.code} onRetry={results.refetch} />
        ) : items.length === 0 ? (
          <EmptyState message={`No results for "${trimmedQuery}".`} />
        ) : (
          <View>
            {items.map((item: any) => (
              <AcademyCard
                key={item.id}
                academy={item}
                onPress={() => router.push(`/academy/${item.id}`)}
                isSaved={savedIds.has(item.id)}
                onToggleSave={(id) => toggleSave.mutate(id)}
              />
            ))}
            {results.hasNextPage && (
              <Pressable
                onPress={() => results.fetchNextPage()}
                style={{ alignItems: 'center', paddingVertical: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Load more results"
              >
                <Text
                  style={{
                    fontFamily: theme.font.sansSemibold,
                    fontSize: 13,
                    color: theme.color.persimmon,
                  }}
                >
                  {results.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  results: { paddingHorizontal: 18, paddingBottom: 40 },
  prompt: { paddingTop: 60, paddingHorizontal: 24 },
});
