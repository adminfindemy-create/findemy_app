import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { tokens, useTheme } from "@findemy/ui";
import { BottomSheet } from "@/components/BottomSheet";
import type { Program } from "@/lib/programs";

type Workshop = {
  id: string;
  title?: string;
  name?: string;
  type?: string;
  starts_at?: string;
  fee_paise?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  academyId: string;
  academyName: string;
  programs: Program[];
  workshops: Workshop[];
};

export function OfferingsSheet({ visible, onClose, academyId, academyName, programs, workshops }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const handleProgram = (programId: string) => {
    onClose();
    router.push({ pathname: `/program/${programId}`, params: { academy_id: academyId } });
  };

  const handleWorkshop = (workshopId: string) => {
    onClose();
    router.push(`/workshop/${workshopId}`);
  };

  const hasNothing = programs.length === 0 && workshops.length === 0;
  const shortName = academyName.split(" ")[0];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 24,
              color: theme.color.ink,
              flex: 1,
              letterSpacing: -0.2,
            }}
          >
            {"What's at "}
            <Text style={{ fontStyle: "italic", color: theme.color.persimmon }}>{shortName}</Text>
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasNothing ? (
            <Text
              style={{
                fontFamily: tokens.font.sans,
                fontSize: 14,
                color: theme.color.mist,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              No offerings available yet.
            </Text>
          ) : null}

          {programs.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>PROGRAMS</Text>
              {programs.map((program) => {
                const trialFee = Math.round(program.trial_fee_paise / 100);
                const monthly =
                  program.monthly_fee_paise_from > 0
                    ? ` · ₹${Math.round(program.monthly_fee_paise_from / 100)}/mo`
                    : "";
                const isFull = program.total_seats_left <= 0;
                const isLow = !isFull && program.total_seats_left <= 3;
                return (
                  <Pressable
                    key={program.id}
                    onPress={() => handleProgram(program.id)}
                    style={[
                      styles.card,
                      { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            fontFamily: theme.font.serif,
                            fontSize: 17,
                            color: theme.color.ink,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {program.title}
                        </Text>
                        <View
                          style={[styles.lvlPill, { backgroundColor: theme.color.paperWarm }]}
                        >
                          <Text
                            style={{
                              fontFamily: tokens.font.sans,
                              fontSize: 9,
                              fontWeight: "700",
                              color: theme.color.mist,
                              letterSpacing: 0.5,
                            }}
                          >
                            {program.level.toUpperCase().slice(0, 6)}
                          </Text>
                        </View>
                      </View>

                      {program.coach_names.length > 0 ? (
                        <Text
                          style={{
                            fontFamily: tokens.font.sans,
                            fontSize: 11,
                            color: theme.color.mist,
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          {program.coach_names.slice(0, 2).join(" · ")}
                        </Text>
                      ) : null}

                      <Text
                        style={{
                          fontFamily: tokens.font.sans,
                          fontSize: 12,
                          color: isFull ? theme.color.mist : theme.color.ink,
                          marginTop: 6,
                          fontWeight: "500",
                        }}
                      >
                        {isFull
                          ? "Full · join waitlist"
                          : `₹${trialFee} trial${monthly}`}
                        {isLow ? (
                          <Text style={{ color: theme.color.persimmon }}>
                            {" · "}
                            {program.total_seats_left} seat
                            {program.total_seats_left === 1 ? "" : "s"} left
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, color: theme.color.mist }}>›</Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          {workshops.length > 0 ? (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.color.mist, marginTop: programs.length > 0 ? 20 : 0 },
                ]}
              >
                WORKSHOPS
              </Text>
              {workshops.map((w) => {
                const fee = w.fee_paise != null ? `₹${Math.round(w.fee_paise / 100)}` : null;
                const title = w.title ?? w.name ?? "Workshop";
                const dateLabel = w.starts_at
                  ? new Date(w.starts_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : null;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => handleWorkshop(w.id)}
                    style={[
                      styles.card,
                      { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: theme.font.serif,
                          fontSize: 17,
                          color: theme.color.ink,
                        }}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      {w.type || dateLabel ? (
                        <Text
                          style={{
                            fontFamily: tokens.font.sans,
                            fontSize: 11,
                            color: theme.color.mist,
                            marginTop: 3,
                          }}
                        >
                          {[w.type, dateLabel].filter(Boolean).join(" · ")}
                        </Text>
                      ) : null}
                      {fee ? (
                        <Text
                          style={{
                            fontFamily: tokens.font.sans,
                            fontSize: 12,
                            color: theme.color.ink,
                            marginTop: 6,
                            fontWeight: "500",
                          }}
                        >
                          {fee}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 16, color: theme.color.mist }}>›</Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}
        </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: tokens.font.sans,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lvlPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
