import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isLocalE2E = process.env.EXPO_PUBLIC_E2E_LOCAL === "true";

// Storage adapter that persists Supabase auth session using SecureStore on iOS/Android and localStorage on Web
// (Local E2E Simulator builds built without code signing cannot access iOS Keychain, so they use AsyncStorage.)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    if (isLocalE2E) {
      return AsyncStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn("SecureStore.getItem error:", e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    if (isLocalE2E) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn("SecureStore.setItem error:", e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    if (isLocalE2E) {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore.deleteItem error:", e);
    }
  },
};

import Constants from "expo-constants";
import * as Device from "expo-device";

function getSupabaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (__DEV__) {
    const devUrl = envUrl || "http://localhost:54321";

    // Android Emulator (virtual): 10.0.2.2 points to host loopback
    if (Platform.OS === "android" && !Device.isDevice && (devUrl.includes("localhost") || devUrl.includes("127.0.0.1"))) {
      return devUrl.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
    }

    // Extract bundler host IP (e.g. "192.168.1.116" when running via Expo on physical device)
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
    const debuggerHost = hostUri?.split(":")?.[0];

    // Physical device (iOS / Android): replace localhost with host computer's IP
    if (Device.isDevice && debuggerHost && (devUrl.includes("localhost") || devUrl.includes("127.0.0.1"))) {
      return devUrl.replace("localhost", debuggerHost).replace("127.0.0.1", debuggerHost);
    }

    return devUrl;
  }

  const isE2eLocal = process.env.EXPO_PUBLIC_E2E_LOCAL === "true";
  const isLoopbackHttp = Boolean(
    envUrl && /^http:\/\/(10\.0\.2\.2|127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(envUrl)
  );

  if (!envUrl || (!envUrl.startsWith("https://") && !(isE2eLocal && isLoopbackHttp))) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL must be configured with https:// in production builds.");
  }

  return envUrl;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (__DEV__ ? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" : "");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
