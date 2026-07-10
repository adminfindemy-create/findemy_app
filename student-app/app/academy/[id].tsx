import React, { useRef, useState } from "react";
import { View, Text, ScrollView, FlatList, Pressable, StyleSheet, Share, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, BlockPrintCover, IconChevL, IconMappin } from "@findemy/ui";
import { Image } from "expo-image";
import { useAcademy, useAcademyReviews, useAcademyWorkshops } from "@/hooks/useAcademy";
import type { Workshop } from "@findemy/types";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsAcademySaved, useToggleSavedAcademy } from "@/hooks/useSaved";
import { enrichProgram } from "@/lib/programs";
import { SegTabs } from "@/components/SegTabs";
import { ProgramRowCard } from "@/components/ProgramRowCard";
import { WorkshopRowCard } from "@/components/WorkshopRowCard";

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
const isVideoUrl = (url: string) => VIDEO_EXT.test(url);

type Tab = "programs" | "workshops";

function CircleBtn({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label: string }) {
  return (
    <Pressable style={styles.circleBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      {children}
    </Pressable>
  );
}

function Stat({ value, label, star, onPress }: { value: string; label: string; star?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const inner = (
    <>
      <Text style={{ fontFamily: theme.font.serif, fontSize: 21, color: theme.color.ink }}>
        {star ? <Text style={{ color: theme.color.persimmon }}>★ </Text> : null}
        {value}
      </Text>
      <Text style={[styles.statLbl, { fontFamily: theme.font.sansBold, color: theme.color.mist }]}>{label}</Text>
    </>
  );
  const boxStyle = [styles.stat, { borderColor: theme.color.hairline, ...theme.shadow.sm }];
  if (onPress) {
    return (
      <Pressable style={boxStyle} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {inner}
      </Pressable>
    );
  }
  return <View style={boxStyle}>{inner}</View>;
}

function BlockLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>{children}</Text>
  );
}

export default function AcademyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>("programs");
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const reviewsY = useRef(0);
  const scrollToReviews = () => {
    setReviewsExpanded(true);
    scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current + reviewsY.current - 12), animated: true });
  };

  const { data, error, isLoading, isRefetching, refetch } = useAcademy(id);
  const { data: workshopsData } = useAcademyWorkshops(id);
  const {
    data: reviewsData,
    hasNextPage: reviewsHasNextPage,
    fetchNextPage: reviewsFetchNextPage,
    isFetchingNextPage: reviewsIsFetchingNextPage,
  } = useAcademyReviews(id);

  const isSaved = useIsAcademySaved(id);
  const toggleSave = useToggleSavedAcademy();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <SkeletonLoader height={300} borderRadius={0} />
        <View style={{ padding: 18, gap: 10 }}>
          <SkeletonLoader height={32} width="65%" borderRadius={8} />
          <SkeletonLoader height={16} width="40%" borderRadius={6} />
          <SkeletonLoader height={70} borderRadius={18} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const academy = data?.academy as any;
  const coaches = (data?.coaches ?? []) as any[];
  const reviews = reviewsData?.pages.flatMap((p: any) => p.items) ?? [];
  const workshops = (workshopsData?.items ?? []) as Workshop[];

  // Programs are server-provided; the client only enriches them (image + display level).
  const programs = ((data?.programs ?? []) as any[]).map(enrichProgram);
  const totalOfferings = programs.length + workshops.length;
  const reviewCount = academy?.review_count ?? academy?.ratingCount ?? 0;

  const inlinePrograms = programs.slice(0, 2);
  const inlineWorkshops = workshops.slice(0, 2);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.paper }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {/* Hero */}
        <View style={{ position: "relative", height: 300 }}>
          {academy?.images?.length > 0 ? (
            <FlatList
              data={academy.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_item: string, i: number) => `img-${i}`}
              renderItem={({ item }: { item: string }) =>
                isVideoUrl(item) ? (
                  <View style={{ width: 375, height: 300, backgroundColor: theme.color.ink, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 22, marginLeft: 3 }}>▶</Text>
                    </View>
                  </View>
                ) : (
                  <Image source={{ uri: item }} style={{ width: 375, height: 300 }} contentFit="cover" />
                )
              }
              style={{ height: 300 }}
            />
          ) : (
            <BlockPrintCover category={academy?.category ?? "music"} variant={2} letter={academy?.name?.[0]} height={300} />
          )}

          <View style={styles.scrimTop} pointerEvents="none" />
          <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
            <View style={styles.topBarInner}>
              <CircleBtn label="Back" onPress={() => router.back()}>
                <IconChevL size={18} color="#fff" />
              </CircleBtn>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <CircleBtn label="Share" onPress={() => Share.share({ message: `Check out ${academy?.name} on Findemy!` })}>
                  <Text style={{ color: "#fff", fontSize: 15 }}>↑</Text>
                </CircleBtn>
                <CircleBtn label={isSaved ? "Remove from wishlist" : "Save to wishlist"} onPress={() => toggleSave.mutate(id)}>
                  <Text style={{ color: isSaved ? theme.color.persimmon : "#fff", fontSize: 16 }}>{isSaved ? "♥" : "♡"}</Text>
                </CircleBtn>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Body */}
        <View style={{ padding: 18 }} onLayout={(e) => { bodyY.current = e.nativeEvent.layout.y; }}>
          <Text style={[styles.cat, { fontFamily: theme.font.sansBold, color: theme.color.persimmon }]}>
            {String(academy?.category ?? "").toUpperCase()}
          </Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 27, lineHeight: 30, color: theme.color.ink, marginTop: 4 }}>
            {academy?.name}
            {academy?.verified ? <Text style={{ fontSize: 15, color: theme.color.jade }}>  ✓</Text> : null}
          </Text>
          {academy?.address ? (
            <View style={styles.locRow}>
              <IconMappin size={13} color={theme.color.persimmon} />
              <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist }}>
                {academy.address}
                {academy.distance_km != null ? ` · ${academy.distance_km} km` : ""}
              </Text>
            </View>
          ) : null}

          {/* Stats */}
          <View style={styles.stats}>
            <Stat value={(academy?.rating ?? 0).toFixed(1)} label="Rating" star />
            <Stat value={String(reviewCount)} label="Reviews" onPress={scrollToReviews} />
            <Stat value={String(programs.length)} label="Programs" />
          </View>

          {/* About */}
          {academy?.bio ? (
            <View style={{ marginBottom: 8 }}>
              <BlockLabel>About</BlockLabel>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 21, color: theme.color.inkSoft }}>
                {academy.bio}
              </Text>
            </View>
          ) : null}

          {/* Offerings */}
          <View style={{ marginTop: 14 }}>
            <SegTabs
              value={tab}
              onChange={setTab}
              options={[
                { key: "programs", label: "Programs" },
                { key: "workshops", label: "Workshops" },
              ]}
            />
          </View>

          <View style={{ marginTop: 14 }}>
            {tab === "programs" ? (
              inlinePrograms.length === 0 ? (
                <EmptyState message="No programs available yet." />
              ) : (
                inlinePrograms.map((program) => (
                  <ProgramRowCard
                    key={program.id}
                    program={program}
                    onPress={() => router.push({ pathname: `/program/${program.id}`, params: { academy_id: id } })}
                  />
                ))
              )
            ) : inlineWorkshops.length === 0 ? (
              <EmptyState message="No upcoming workshops." />
            ) : (
              inlineWorkshops.map((w) => <WorkshopRowCard key={w.id} w={w} onPress={() => router.push(`/workshop/${w.id}`)} />)
            )}
          </View>

          {totalOfferings > 2 ? (
            <Pressable
              onPress={() => router.push({ pathname: `/academy/${id}/offerings`, params: { tab } })}
              style={[styles.seeAll, { borderColor: theme.color.hairline, ...theme.shadow.sm }]}
            >
              <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.ink }}>
                See all {totalOfferings} offerings
              </Text>
            </Pressable>
          ) : null}

          {/* Reviews */}
          <View style={{ marginTop: 24 }} onLayout={(e) => { reviewsY.current = e.nativeEvent.layout.y; }}>
            <View style={styles.reviewHead}>
              <BlockLabel>Reviews</BlockLabel>
              <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist }}>
                ★ {(academy?.rating ?? 0).toFixed(1)} · {reviewCount}
              </Text>
            </View>
            {reviews.length === 0 ? (
              <EmptyState message="No reviews yet. Be the first!" />
            ) : (
              <>
                {(reviewsExpanded ? reviews : reviews.slice(0, 5)).map((review: any) => {
                  const name = review.user_name ?? review.student_name ?? "Anonymous";
                  const full = Math.round(review.rating ?? 0);
                  return (
                    <View key={review.id} style={[styles.review, { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm }]}>
                      <View style={styles.reviewRow}>
                        <View style={[styles.reviewPic, { backgroundColor: theme.color.persimmon }]}>
                          <Text style={{ color: "#fff", fontFamily: theme.font.serifItalic, fontSize: 14 }}>{name[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={{ flex: 1, fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.ink }}>{name}</Text>
                        <Text style={{ color: theme.color.persimmon, fontSize: 12, letterSpacing: 1.5 }}>
                          {"★".repeat(full)}
                          <Text style={{ color: theme.color.whisper }}>{"☆".repeat(Math.max(0, 5 - full))}</Text>
                        </Text>
                      </View>
                      {review.comment ? (
                        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, lineHeight: 20, color: theme.color.inkSoft, marginTop: 8 }}>
                          {review.comment}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                {!reviewsExpanded && (reviews.length > 5 || reviewsHasNextPage) ? (
                  <Pressable
                    onPress={() => setReviewsExpanded(true)}
                    style={[styles.seeAll, { borderColor: theme.color.hairline, ...theme.shadow.sm, marginTop: 12 }]}
                  >
                    <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.ink }}>
                      See all reviews
                    </Text>
                  </Pressable>
                ) : reviewsExpanded && reviewsHasNextPage ? (
                  <Pressable
                    onPress={() => reviewsFetchNextPage()}
                    style={[styles.seeAll, { borderColor: theme.color.hairline, ...theme.shadow.sm, marginTop: 12 }]}
                  >
                    <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.ink }}>
                      {reviewsIsFetchingNextPage ? "Loading…" : "Load more reviews"}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {/* Coaches */}
          {coaches.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <BlockLabel>Coaches</BlockLabel>
              {coaches.map((coach: any) => (
                <View key={coach.id} style={[styles.coach, { borderBottomColor: theme.color.hairline }]}>
                  <View style={[styles.coachPic, { backgroundColor: theme.color.persimmon }]}>
                    <Text style={{ color: "#fff", fontFamily: theme.font.serifItalic, fontSize: 16 }}>{coach.name?.[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>{coach.name}</Text>
                    {coach.specialty ? (
                      <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
                        {coach.specialty}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  topBar: { position: "absolute", top: 0, left: 0, right: 0 },
  topBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,16,14,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cat: { fontSize: 10.5, letterSpacing: 2 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  stats: { flexDirection: "row", gap: 10, marginVertical: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statLbl: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 5 },
  blockLabel: { fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 9 },
  seeAll: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    marginTop: 2,
  },
  reviewHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  review: { borderWidth: 1, borderRadius: 16, padding: 13, marginBottom: 10 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  reviewPic: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  coach: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  coachPic: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
