import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

type SkeletonCardProps = {
  isDarkMode: boolean;
};

export default function SkeletonCard({ isDarkMode }: SkeletonCardProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const backgroundColor = isDarkMode ? "#1F2937" : "#E5E7EB";
  const highlightColor = isDarkMode ? "#374151" : "#D1D5DB";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? "#020617" : "#FFFFFF",
          borderColor: isDarkMode ? "#1F2937" : "#E5E7EB",
        },
      ]}
    >
      {/* Header skeleton */}
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.avatarSkeleton,
            { backgroundColor, opacity },
          ]}
        />
        <View style={styles.headerText}>
          <Animated.View
            style={[
              styles.textSkeleton,
              { backgroundColor, opacity, width: 120, height: 14 },
            ]}
          />
          <Animated.View
            style={[
              styles.textSkeleton,
              { backgroundColor, opacity, width: 80, height: 12, marginTop: 6 },
            ]}
          />
        </View>
      </View>

      {/* Image skeleton */}
      <Animated.View
        style={[
          styles.imageSkeleton,
          { backgroundColor, opacity },
        ]}
      />

      {/* Actions skeleton */}
      <View style={styles.actions}>
        <Animated.View
          style={[
            styles.iconSkeleton,
            { backgroundColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.iconSkeleton,
            { backgroundColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.iconSkeleton,
            { backgroundColor, opacity },
          ]}
        />
      </View>

      {/* Text skeleton */}
      <View style={styles.textContainer}>
        <Animated.View
          style={[
            styles.textSkeleton,
            { backgroundColor, opacity, width: "80%", height: 14 },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeleton,
            { backgroundColor, opacity, width: "60%", height: 14, marginTop: 8 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarSkeleton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  imageSkeleton: {
    width: "100%",
    height: 400,
  },
  actions: {
    flexDirection: "row",
    padding: 12,
    gap: 16,
  },
  iconSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  textContainer: {
    padding: 12,
    paddingTop: 0,
  },
  textSkeleton: {
    borderRadius: 4,
  },
});

