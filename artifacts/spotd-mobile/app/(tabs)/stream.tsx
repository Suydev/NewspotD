import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { getAudioStreamUrl, searchYouTube, InvidiousVideo } from "@/utils/invidious";

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface NowPlaying {
  video: InvidiousVideo;
  streamUrl: string;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const GENRE_TILES = [
  { label: "Bollywood", color: "#e91e8c", icon: "heart" as const },
  { label: "Lo-fi", color: "#3d5afe", icon: "coffee" as const },
  { label: "Hip Hop", color: "#ff6d00", icon: "mic" as const },
  { label: "EDM", color: "#00e5ff", icon: "zap" as const },
  { label: "Punjabi", color: "#ff9f0a", icon: "music" as const },
  { label: "Pop", color: "#ce93d8", icon: "star" as const },
  { label: "Classical", color: "#a5d6a7", icon: "feather" as const },
  { label: "Devotional", color: "#ffcc02", icon: "sun" as const },
];

export default function StreamScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvidiousVideo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const positionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const clearTimer = () => {
    if (positionTimer.current) {
      clearInterval(positionTimer.current);
      positionTimer.current = null;
    }
  };

  const unloadSound = async () => {
    clearTimer();
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      unloadSound();
    };
  }, []);

  const playVideo = useCallback(async (video: InvidiousVideo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayerState("loading");
    setNowPlaying({ video, streamUrl: "" });
    setPosition(0);
    setDuration(video.lengthSeconds || 0);

    await unloadSound();

    try {
      const { url } = await getAudioStreamUrl(video.videoId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 1000 },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setPlayerState("idle");
            setPosition(0);
            clearTimer();
            return;
          }
          setPosition(status.positionMillis ?? 0);
          if (status.durationMillis) setDuration(status.durationMillis);
          if (status.isPlaying) setPlayerState("playing");
          else if (!status.isPlaying && status.isLoaded) setPlayerState("paused");
        }
      );
      soundRef.current = sound;
      setNowPlaying({ video, streamUrl: url });
      setPlayerState("playing");
    } catch (e: any) {
      setPlayerState("error");
      setNowPlaying(null);
    }
  }, []);

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (playerState === "playing") {
      await soundRef.current.pauseAsync();
      setPlayerState("paused");
    } else {
      await soundRef.current.playAsync();
      setPlayerState("playing");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const stopPlayer = async () => {
    await unloadSound();
    setNowPlaying(null);
    setPlayerState("idle");
    setPosition(0);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const res = await searchYouTube(query.trim());
      setResults(res);
      if (!res.length) setSearchError("No results found. Try a different query.");
    } catch (e: any) {
      setSearchError("Search failed. Check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleGenre = (genre: string) => {
    setQuery(genre + " top songs");
    setTimeout(() => handleSearch(), 50);
  };

  const positionSec = Math.floor(position / 1000);
  const durationSec = Math.floor(duration / 1000) || nowPlaying?.video.lengthSeconds || 0;
  const progress = durationSec > 0 ? positionSec / durationSec : 0;

  const botPad = Platform.OS === "web" ? 84 : 72;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + (nowPlaying ? 120 : 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Spot D</Text>
          <Text style={styles.subtitle}>Stream · No Ads · Enjoy</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search artists, playlists, albums, podcasts…"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(""); setResults([]); }} hitSlop={8}>
                <Feather name="x" size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            {searching ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Feather name="search" size={18} color={colors.background} />
            )}
          </Pressable>
        </View>

        {!results.length && !searching && !searchError && (
          <>
            <Text style={styles.sectionTitle}>Browse</Text>
            <View style={styles.genreGrid}>
              {GENRE_TILES.map((g) => (
                <TouchableOpacity
                  key={g.label}
                  style={[styles.genreTile, { backgroundColor: g.color }]}
                  onPress={() => handleGenre(g.label)}
                  activeOpacity={0.8}
                >
                  <Feather name={g.icon} size={22} color="#fff" style={styles.genreIcon} />
                  <Text style={styles.genreLabel}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {searching && (
          <View style={styles.centerMsg}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Searching…</Text>
          </View>
        )}

        {searchError ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        ) : null}

        {results.length > 0 && (
          <View style={styles.resultsList}>
            <Text style={styles.sectionTitle}>Results · {results.length} tracks</Text>
            {results.map((v, idx) => {
              const isActive = nowPlaying?.video.videoId === v.videoId;
              return (
                <TouchableOpacity
                  key={v.videoId}
                  style={[styles.track, isActive && styles.trackActive]}
                  onPress={() => playVideo(v)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.trackNum, isActive && { color: colors.primary }]}>
                    {isActive && playerState === "playing" ? (
                      <Feather name="volume-2" size={12} color={colors.primary} />
                    ) : (
                      `${idx + 1}`
                    )}
                  </Text>
                  <Image
                    source={{ uri: v.thumbnail }}
                    style={styles.trackThumb}
                  />
                  <View style={styles.trackInfo}>
                    <Text
                      style={[styles.trackTitle, isActive && { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {v.title}
                    </Text>
                    <Text style={styles.trackAuthor} numberOfLines={1}>
                      {v.author}{v.viewCount > 0 ? ` · ${formatViews(v.viewCount)} views` : ""}
                    </Text>
                  </View>
                  <Text style={styles.trackDuration}>
                    {formatDuration(v.lengthSeconds)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {nowPlaying && (
        <View style={[styles.player, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]}
            />
          </View>
          <View style={styles.playerContent}>
            <Image
              source={{ uri: nowPlaying.video.thumbnail }}
              style={styles.playerThumb}
            />
            <View style={styles.playerMeta}>
              <Text style={styles.playerTitle} numberOfLines={1}>
                {nowPlaying.video.title}
              </Text>
              <Text style={styles.playerSub} numberOfLines={1}>
                {nowPlaying.video.author}
                {durationSec > 0
                  ? ` · ${formatDuration(positionSec)} / ${formatDuration(durationSec)}`
                  : ""}
              </Text>
            </View>
            <View style={styles.playerControls}>
              {playerState === "loading" ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Pressable onPress={togglePlay} hitSlop={10}>
                  <Feather
                    name={playerState === "playing" ? "pause" : "play"}
                    size={26}
                    color={colors.primary}
                  />
                </Pressable>
              )}
              <Pressable onPress={stopPlayer} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.text },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.primary,
  },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genreTile: {
    width: "47%",
    height: 90,
    borderRadius: 10,
    padding: 14,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  genreIcon: { position: "absolute", top: 12, right: 12, opacity: 0.7 },
  genreLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  centerMsg: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.error + "18",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.error + "44",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.error,
    flex: 1,
  },
  resultsList: { gap: 6 },
  track: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  trackActive: { backgroundColor: colors.primaryMuted },
  trackNum: {
    width: 20,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
  },
  trackThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.surface },
  trackInfo: { flex: 1, gap: 2 },
  trackTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  trackAuthor: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  trackDuration: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
  },
  player: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.surfaceHighlight,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  playerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  playerThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  playerMeta: { flex: 1, gap: 2 },
  playerTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  playerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});
