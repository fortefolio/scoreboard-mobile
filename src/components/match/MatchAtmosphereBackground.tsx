import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

export type AtmosphereSportType =
  | "football"
  | "tennis"
  | "beach_volleyball"
  | "volleyball"
  | "basketball"
  | "padel";

const ALL_SPORTS: AtmosphereSportType[] = [
  "football",
  "tennis",
  "beach_volleyball",
  "volleyball",
  "basketball",
  "padel",
];

const BACKGROUND_ASSETS: Record<
  AtmosphereSportType,
  { portrait: any; landscape: any }
> = {
  football: {
    portrait: require("../../../assets/backgrounds/football-portrait.webp"),
    landscape: require("../../../assets/backgrounds/football-landscape.webp"),
  },
  tennis: {
    portrait: require("../../../assets/backgrounds/tennis-portrait.webp"),
    landscape: require("../../../assets/backgrounds/tennis-landscape.webp"),
  },
  beach_volleyball: {
    portrait: require("../../../assets/backgrounds/beach_volleyball-portrait.webp"),
    landscape: require("../../../assets/backgrounds/beach_volleyball-landscape.webp"),
  },
  volleyball: {
    portrait: require("../../../assets/backgrounds/volleyball-portrait.webp"),
    landscape: require("../../../assets/backgrounds/volleyball-landscape.webp"),
  },
  basketball: {
    portrait: require("../../../assets/backgrounds/basketball-portrait.webp"),
    landscape: require("../../../assets/backgrounds/basketball-landscape.webp"),
  },
  padel: {
    portrait: require("../../../assets/backgrounds/padel-portrait.webp"),
    landscape: require("../../../assets/backgrounds/padel-landscape.webp"),
  },
};

export function normalizeAtmosphereSport(
  sport?: string | null
): AtmosphereSportType {
  const s = (sport || "").toLowerCase().trim();
  if (s.includes("beach")) return "beach_volleyball";
  if (s.includes("volley")) return "volleyball";
  if (s.includes("padel")) return "padel";
  if (s.includes("tennis") || s.includes("ténis")) return "tennis";
  if (s.includes("basket")) return "basketball";
  if (s.includes("foot") || s.includes("futebol")) return "football";
  return "tennis";
}

interface MatchAtmosphereBackgroundProps {
  sportType?: string | null;
  mode?: "spectator" | "umpire";
  forcedOrientation?: "portrait" | "landscape";
}

function MatchAtmosphereBackgroundComponent({
  sportType,
  mode = "spectator",
  forcedOrientation,
}: MatchAtmosphereBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const orientation: "portrait" | "landscape" =
    forcedOrientation || (width > height ? "landscape" : "portrait");

  const isRandom = (sportType || "").toLowerCase().trim() === "random";
  const resolvedSport = useMemo<AtmosphereSportType>(() => {
    if (isRandom) {
      return ALL_SPORTS[Math.floor(Math.random() * ALL_SPORTS.length)];
    }
    return normalizeAtmosphereSport(sportType);
  }, [isRandom, sportType]);

  const source = BACKGROUND_ASSETS[resolvedSport][orientation];
  const isUmpire = mode === "umpire";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={source}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isUmpire
              ? "rgba(11, 13, 20, 0.90)"
              : "rgba(11, 13, 20, 0.85)",
          },
        ]}
      />
    </View>
  );
}

export const MatchAtmosphereBackground = React.memo(
  MatchAtmosphereBackgroundComponent
);
