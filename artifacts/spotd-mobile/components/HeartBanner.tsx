import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";

const useND = Platform.OS !== "web";

export function HeartBanner() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 180,
          useNativeDriver: useND,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: useND,
        }),
        Animated.delay(120),
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 140,
          useNativeDriver: useND,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: useND,
        }),
        Animated.delay(900),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [scale]);

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Made with love for listeners </Text>
      <Animated.Text style={[styles.heart, { transform: [{ scale }] }]}>
        ❤️
      </Animated.Text>
      <Text style={styles.text}> by Suyash Prabhu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a0a0a",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ff363630",
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  heart: {
    fontSize: 12,
    lineHeight: 18,
  },
});
