import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

interface SportIconProps {
  sport?: string | null;
  size?: number;
  color?: string;
}

export function SportIcon({ sport, size = 16, color = "#c3c0ff" }: SportIconProps) {
  const normalized = (sport || "").toLowerCase();

  if (normalized.includes("padel")) {
    return <MaterialCommunityIcons name="racquetball" size={size} color={color} />;
  }
  if (normalized.includes("tennis")) {
    return <Ionicons name="tennisball" size={size} color={color} />;
  }
  if (normalized.includes("beach volleyball") || normalized.includes("beach_volleyball")) {
    return <MaterialCommunityIcons name="volleyball" size={size} color={color} />;
  }
  if (normalized.includes("volleyball")) {
    return <MaterialCommunityIcons name="volleyball" size={size} color={color} />;
  }
  if (normalized.includes("football") || normalized.includes("soccer")) {
    return <Ionicons name="football" size={size} color={color} />;
  }
  if (normalized.includes("basketball")) {
    return <Ionicons name="basketball" size={size} color={color} />;
  }

  return <Ionicons name="trophy-outline" size={size} color={color} />;
}
