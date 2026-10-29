import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Storage adapter that persists Supabase auth session using SecureStore on iOS/Android and localStorage on Web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
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
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore.deleteItem error:", e);
    }
  },
};

function getSupabaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  // On Android physical/emulator, 10.0.2.2 points to host machine loopback
  if (Platform.OS === "android" && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
    return envUrl.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
  }
  return envUrl;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
