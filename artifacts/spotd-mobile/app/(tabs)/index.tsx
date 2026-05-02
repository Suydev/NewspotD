import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { URLInput } from "@/components/URLInput";
import colors from "@/constants/colors";
import { useDownloads } from "@/contexts/DownloadContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { ParsedUrl } from "@/utils/urlParser";

type Tab = "spotify" | "youtube" | "podcast";

const TAB_INFO: Record<
  Tab,
  {
    label: string;
    color: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    placeholder: string;
    tips: {
      icon: React.ComponentProps<typeof Feather>["name"];
      label: string;
      hint: string;
    }[];
  }
> = {
  spotify: {
    label: "Spotify",
    color: colors.spotify,
    icon: "music",
    placeholder: "Paste Spotify track, album or playlist URL…",
    tips: [
      { icon: "music", label: "Track", hint: "open.spotify.com/track/…" },
      { icon: "disc", label: "Album", hint: "open.spotify.com/album/…" },
      { icon: "list", label: "Playlist", hint: "open.spotify.com/playlist/…" },
      { icon: "mic", label: "Podcast Episode", hint: "open.spotify.com/episode/…" },
    ],
  },
  youtube: {
    label: "YouTube",
    color: colors.youtube,
    icon: "youtube",
    placeholder: "Paste YouTube video or playlist URL…",
    tips: [
      { icon: "youtube", label: "Video (up to 8K)", hint: "youtube.com/watch?v=…" },
      { icon: "film", label: "Short", hint: "youtube.com/shorts/…" },
      { icon: "list", label: "Playlist (all videos)", hint: "youtube.com/playlist?list=…" },
    ],
  },
  podcast: {
    label: "Podcasts",
    color: "#ff9f0a",
    icon: "mic",
    placeholder: "Paste Spotify episode or podcast RSS feed URL…",
    tips: [
      { icon: "mic", label: "Spotify Episode", hint: "open.spotify.com/episode/…" },
      { icon: "rss", label: "RSS Feed", hint: "yourpodcast.com/feed.rss" },
    ],
  },
};

export default function DownloaderScreen() {
  const { startDownload, activeCount } = useDownloads();
  const { settings } = useSettings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("spotify");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (parsed: ParsedUrl) => {
    try {
      await startDownload(parsed);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      router.navigate("/(tabs)/downloads");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const botPad = Platform.OS === "web" ? 34 : 0;
  const tab = TAB_INFO[activeTab];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: botPad + 32 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Feather name="download-cloud" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.appName}>SpotD</Text>
            <Text style={styles.appSub}>by Suyash Prabhu</Text>
          </View>
        </View>

        <Text style={styles.headline}>
          Download anything.{"\n"}No account needed.
        </Text>

        {activeCount > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.navigate("/(tabs)/downloads")}
            activeOpacity={0.8}
          >
            <View style={styles.activeDot} />
            <Text style={styles.activeBannerText}>
              {activeCount} download{activeCount > 1 ? "s" : ""} in progress
            </Text>
            <Feather name="arrow-right" size={13} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(Object.keys(TAB_INFO) as Tab[]).map((key) => {
          const t = TAB_INFO[key];
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              style={[
                styles.tabBtn,
                active && { borderBottomColor: t.color, borderBottomWidth: 2 },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(key);
              }}
            >
              <Feather
                name={t.icon}
                size={14}
                color={active ? t.color : colors.textTertiary}
              />
              <Text style={[styles.tabLabel, active && { color: t.color }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {success && (
        <View style={styles.successBanner}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={styles.successText}>Download started!</Text>
        </View>
      )}

      <View style={styles.card}>
        <URLInput onSubmit={handleSubmit} placeholder={tab.placeholder} />
      </View>

      <View style={styles.qualityRow}>
        <View style={[styles.qualityChip, { borderColor: tab.color + "55" }]}>
          <Feather
            name={
              activeTab === "youtube" && settings.downloadMode === "video"
                ? "video"
                : "headphones"
            }
            size={13}
            color={tab.color}
          />
          <Text style={[styles.qualityText, { color: tab.color }]}>
            {activeTab === "youtube" && settings.downloadMode === "video"
              ? `Video ${settings.videoQuality}p`
              : settings.audioQuality === "flac"
              ? "FLAC (Best)"
              : `MP3 ${settings.audioQuality}kbps`}
          </Text>
        </View>
        <Text style={styles.qualityHint}>Change in Settings →</Text>
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Supported</Text>
        <View style={styles.tipsGrid}>
          {tab.tips.map((tip) => (
            <View key={tip.label} style={styles.tipChip}>
              <Feather name={tip.icon} size={13} color={tab.color} />
              <View>
                <Text style={styles.tipLabel}>{tip.label}</Text>
                <Text style={styles.tipHint} numberOfLines={1}>
                  {tip.hint}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {activeTab === "youtube" && (
        <View style={styles.infoBox}>
          <Feather name="zap" size={13} color={colors.youtube} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Supports 4K (2160p) and 8K (4320p). Set preferred quality in
            Settings → Video Quality.
          </Text>
        </View>
      )}

      {activeTab === "podcast" && (
        <View style={[styles.infoBox, { borderColor: "#ff9f0a44" }]}>
          <Feather name="shield" size={13} color="#ff9f0a" />
          <Text style={[styles.infoText, { color: "#ff9f0a" }]}>
            No Ads. Enjoy. Downloaded locally on your device — no account
            required.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, gap: 16 },
  heroSection: { gap: 12 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text },
  appSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: colors.text,
    lineHeight: 32,
    marginTop: 8,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontFamily: "Inter_500Medium",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.textTertiary,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.success + "18",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + "33",
  },
  successText: {
    fontSize: 13,
    color: colors.success,
    fontFamily: "Inter_500Medium",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  qualityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  qualityText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  qualityHint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  tipsSection: { gap: 10 },
  tipsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tipsGrid: { gap: 6 },
  tipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipLabel: { fontSize: 13, color: colors.text, fontFamily: "Inter_500Medium" },
  tipHint: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
