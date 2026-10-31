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

vi.mock("@expo/vector-icons", () => ({
  Ionicons: (props: any) => React.createElement("span", { "data-testid": `icon-${props.name}` }),
}));
