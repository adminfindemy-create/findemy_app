import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, BlockPrintCover, IconStar, IconMappin } from "@findemy/ui";
import { Image } from "expo-image";

type AcademyCardProps = {
  academy: {
    id: string;
    name: string;
    category: string;
    rating?: number;
    // The discover API returns rating_count/online_available/trial_from_paise;
    // detail responses use the *_count/onlineAvailable spellings. Accept both.
    review_count?: number;
    rating_count?: number;
    distance_km?: number;
    verified?: boolean;
    onlineAvailable?: boolean;
    online_available?: boolean;
    address?: string;
    images?: string[];
    trial_fee_paise?: number;
    trial_from_paise?: number | null;
    monthly_fee_paise?: number;
    monthly_from_paise?: number | null;
    lat?: number;
    lng?: number;
  };
  onPress: () => void;
  variant?: "default" | "compact";
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
};

function variantForId(id: string | undefined): 1 | 2 | 3 | 4 {
  if (!id) return 1;
  const sum = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return (((sum % 4) + 1) as 1 | 2 | 3 | 4);
}

function formatPrice(paise?: number): string {
  if (paise == null) return "—";
  if (paise === 0) return "Free";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function Cover({ academy, height, radius }: { academy: AcademyCardProps["academy"]; height: number; radius: number }) {
  return academy.images?.length ? (
    <Image source={{ uri: academy.images[0] }} style={{ width: "100%", height, borderRadius: radius }} contentFit="cover" />
  ) : (
    <BlockPrintCover
      category={academy.category}
      variant={variantForId(academy.id)}
      letter={academy.name?.[0] ?? "A"}
      height={height}
      hideLetter
      style={{ width: "100%", height, borderRadius: radius, overflow: "hidden" }}
    />
  );
}

function Heart({ saved, onPress, persimmon, ink }: { saved: boolean; onPress?: () => void; persimmon: string; ink: string }) {
  return (
    <Pressable style={styles.heartBtn} onPress={onPress} hitSlop={8} accessibilityLabel={saved ? "Remove from wishlist" : "Save to wishlist"}>
      <Text style={{ fontSize: 15, lineHeight: 17, color: saved ? persimmon : ink }}>{saved ? "♥" : "♡"}</Text>
    </Pressable>
  );
}

export function AcademyCard({ academy, onPress, variant = "default", isSaved = false, onToggleSave }: AcademyCardProps) {
  const theme = useTheme();
  const cat = String(academy.category).toUpperCase();
  const toggle = () => onToggleSave?.(academy.id);

  // Compact = prototype `.studio-card` (top-rated horizontal carousel).
  if (variant === "compact") {
    return (
      <Pressable onPress={onPress} style={styles.studioCard}>
        <View style={[styles.studioCover, theme.shadow.md]}>
          <View style={styles.fill}>
            <Cover academy={academy} height={168} radius={22} />
          </View>
          <View style={styles.scrim} />
          <View style={styles.catTag}>
            <Text style={styles.catTagText}>{cat}</Text>
          </View>
          <View style={styles.studioHeart}>
            <Heart saved={isSaved} onPress={toggle} persimmon={theme.color.persimmon} ink={theme.color.ink} />
          </View>
          <Text style={[styles.studioName, { fontFamily: theme.font.sansBold }]} numberOfLines={2}>
            {academy.name}
          </Text>
        </View>
        <View style={styles.studioMeta}>
          {academy.rating != null ? (
            <View style={styles.starRow}>
              <IconStar size={14} color={theme.color.persimmon} />
              <Text style={[styles.metaStrong, { fontFamily: theme.font.sansSemibold, color: theme.color.persimmon }]}>
                {academy.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
          {academy.rating != null && academy.distance_km != null ? (
            <Text style={{ color: theme.color.whisper }}>·</Text>
          ) : null}
          {academy.distance_km != null ? (
            <Text style={[styles.metaStrong, { fontFamily: theme.font.sansSemibold, color: theme.color.ink }]}>
              {academy.distance_km.toFixed(1)} km
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  // Default = prototype `.near-card` (vertical list row).
  const online = academy.online_available ?? academy.onlineAvailable;
  const reviews = academy.rating_count ?? academy.review_count;
  const trialFrom = academy.trial_from_paise ?? academy.trial_fee_paise;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.nearCard, { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.md }]}
    >
      <View style={styles.thumb}>
        <Cover academy={academy} height={112} radius={16} />
        <View style={{ position: "absolute", top: 7, right: 7 }}>
          <Heart saved={isSaved} onPress={toggle} persimmon={theme.color.persimmon} ink={theme.color.ink} />
        </View>
      </View>

      <View style={styles.nearBody}>
        <View style={styles.nearCat}>
          <Text style={[styles.nearCatText, { fontFamily: theme.font.sansBold, color: theme.color.persimmon }]}>
            {cat}
          </Text>
          {online ? (
            <Text style={[styles.nearCatText, { fontFamily: theme.font.sansBold, color: theme.color.jade }]}>
              · ONLINE
            </Text>
          ) : null}
        </View>

        <Text style={[styles.nearName, { fontFamily: theme.font.sansBold, color: theme.color.ink }]} numberOfLines={2}>
          {academy.name}
        </Text>

        {academy.address || academy.distance_km != null ? (
          <View style={styles.nearLoc}>
            <IconMappin size={13} color={theme.color.persimmon} />
            <Text style={[styles.nearLocText, { fontFamily: theme.font.sansMedium, color: theme.color.inkSoft }]} numberOfLines={1}>
              {[academy.address, academy.distance_km != null ? `${academy.distance_km.toFixed(1)} km` : null].filter(Boolean).join(" · ")}
            </Text>
          </View>
        ) : null}

        {academy.rating != null ? (
          <View style={styles.nearRate}>
            <View style={styles.starRow}>
              <IconStar size={14} color={theme.color.persimmon} />
              <Text style={[styles.metaStrong, { fontFamily: theme.font.sansSemibold, color: theme.color.ink }]}>
                {academy.rating.toFixed(1)}
              </Text>
            </View>
            {reviews != null ? (
              <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.color.whisper }}>
                {reviews} reviews
              </Text>
            ) : null}
          </View>
        ) : null}

        {trialFrom != null ? (
          <View style={[styles.nearFoot, { borderTopColor: theme.color.hairline }]}>
            <View>
              <Text style={[styles.priceLbl, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>TRIAL FROM</Text>
              <Text style={[styles.priceAmt, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>{formatPrice(trialFrom)}</Text>
            </View>
            <View style={[styles.viewPill, { backgroundColor: theme.color.ink }]}>
              <Text style={{ fontFamily: theme.font.sansBold, fontSize: 12.5, color: "#fff" }}>View →</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // studio-card (compact)
  studioCard: { width: 176 },
  studioCover: {
    height: 168,
    borderRadius: 22,
    justifyContent: "flex-end",
    padding: 14,
    overflow: "hidden",
  },
  fill: { ...StyleSheet.absoluteFillObject },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: "rgba(20,16,14,0.18)",
  },
  studioName: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  studioHeart: { position: "absolute", top: 10, right: 10 },
  studioMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  catTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(20,16,14,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaStrong: { fontSize: 12.5, fontWeight: "600" },

  // near-card (default)
  nearCard: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 96 },
  nearBody: { flex: 1, minWidth: 0 },
  nearCat: { flexDirection: "row", alignItems: "center", gap: 6 },
  nearCatText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  nearName: { fontSize: 16, lineHeight: 18, marginTop: 3, marginBottom: 5 },
  nearLoc: { flexDirection: "row", alignItems: "center", gap: 5 },
  nearLocText: { fontSize: 12, flex: 1 },
  nearRate: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  nearFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 9,
    paddingTop: 9,
  },
  priceLbl: { fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  priceAmt: { fontSize: 16, marginTop: 1 },
  viewPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heartBtn: {
    // Prototype `.heart`: white blurred circle with a soft shadow.
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A1611",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
