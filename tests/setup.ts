import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy", Light: "light" },
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
}));

vi.mock("expo-screen-orientation", () => ({
  lockAsync: vi.fn(),
  unlockAsync: vi.fn(),
  OrientationLock: {
    LANDSCAPE: 3,
    PORTRAIT_UP: 1,
  },
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, style }: any) => React.createElement("div", { style }, children),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: (props: any) => React.createElement("span", { "data-testid": `icon-${props.name}` }),
  MaterialCommunityIcons: (props: any) => React.createElement("span", { "data-testid": `icon-${props.name}` }),
  FontAwesome: (props: any) => React.createElement("span", { "data-testid": `icon-${props.name}` }),
  Feather: (props: any) => React.createElement("span", { "data-testid": `icon-${props.name}` }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    channel: () => ({
      on: () => ({ subscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));
