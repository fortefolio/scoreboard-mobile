import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { ScoreBoardTheme } from "@/constants/theme";

interface SkeletonBoxProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = "100%",
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MatchListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container} testID="match-list-skeleton">
      <View style={styles.headerRow}>
        <SkeletonBox width={140} height={24} borderRadius={8} />
        <SkeletonBox width={90} height={32} borderRadius={10} />
      </View>
      <View style={styles.filterRow}>
        <SkeletonBox width={68} height={30} borderRadius={15} />
        <SkeletonBox width={78} height={30} borderRadius={15} />
        <SkeletonBox width={84} height={30} borderRadius={15} />
        <SkeletonBox width={74} height={30} borderRadius={15} />
      </View>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardTop}>
            <SkeletonBox width={90} height={14} borderRadius={6} />
            <SkeletonBox width={64} height={18} borderRadius={9} />
          </View>
          <View style={styles.teamRow}>
            <SkeletonBox width="55%" height={18} borderRadius={6} />
            <SkeletonBox width={36} height={22} borderRadius={6} />
          </View>
          <View style={styles.teamRow}>
            <SkeletonBox width="48%" height={18} borderRadius={6} />
            <SkeletonBox width={36} height={22} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function TournamentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.container} testID="tournament-list-skeleton">
      <View style={styles.headerRow}>
        <SkeletonBox width={160} height={24} borderRadius={8} />
        <SkeletonBox width={100} height={32} borderRadius={10} />
      </View>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardTop}>
            <SkeletonBox width={80} height={16} borderRadius={8} />
            <SkeletonBox width={70} height={16} borderRadius={8} />
          </View>
          <SkeletonBox width="70%" height={20} borderRadius={6} style={{ marginTop: 10 }} />
          <SkeletonBox width="45%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export function MatchDetailSkeleton() {
  return (
    <View style={styles.container} testID="match-detail-skeleton">
      <View style={styles.headerRow}>
        <SkeletonBox width={36} height={36} borderRadius={10} />
        <SkeletonBox width={140} height={20} borderRadius={8} />
        <SkeletonBox width={36} height={36} borderRadius={10} />
      </View>
      <View style={[styles.card, { paddingVertical: 20 }]}>
        <View style={styles.cardTop}>
          <SkeletonBox width={80} height={16} borderRadius={8} />
          <SkeletonBox width={100} height={16} borderRadius={8} />
        </View>
        <View style={[styles.scoreHeroRow]}>
          <View style={styles.scoreHeroCol}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <SkeletonBox width={90} height={16} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
          <SkeletonBox width={88} height={40} borderRadius={10} />
          <View style={styles.scoreHeroCol}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <SkeletonBox width={90} height={16} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <SkeletonBox width="100%" height={44} borderRadius={12} style={{ marginTop: 18 }} />
      </View>
      <View style={styles.filterRow}>
        <SkeletonBox width="31%" height={34} borderRadius={10} />
        <SkeletonBox width="31%" height={34} borderRadius={10} />
        <SkeletonBox width="31%" height={34} borderRadius={10} />
      </View>
      <View style={styles.card}>
        <SkeletonBox width="60%" height={16} borderRadius={6} />
        <SkeletonBox width="100%" height={14} borderRadius={6} style={{ marginTop: 12 }} />
        <SkeletonBox width="85%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container} testID="notification-list-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.teamRow}>
            <SkeletonBox width={34} height={34} borderRadius={17} />
            <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
              <SkeletonBox width="75%" height={15} borderRadius={6} />
              <SkeletonBox width="50%" height={12} borderRadius={6} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  scoreHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  scoreHeroCol: {
    alignItems: "center",
    flex: 1,
  },
});
