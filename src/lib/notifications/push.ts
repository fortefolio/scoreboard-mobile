import { supabase } from "@/lib/supabase/client";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Configure how notifications should be handled when app is open in foreground
try {
  Notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (_) {}

/**
 * Registers device for push notifications and stores FCM token in Supabase
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0c1324",
      });
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenData?.data === "string" ? tokenData.data : String(tokenData);

    if (userId && token) {
      await registerPushToken(userId, token);
    }

    return token;
  } catch (e) {
    console.warn("Could not register push token:", e);
    return null;
  }
}

/**
 * Registers push notification token with Supabase backend
 */
export async function registerPushToken(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;

  try {
    const { error } = await supabase
      .from("user_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, fcm_token" }
      );

    if (error) {
      console.warn("Failed to register push token:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Error in registerPushToken:", e);
    return false;
  }
}

/**
 * Parses deep links from push notification payloads
 */
export function parseNotificationDeepLink(data: any): string | null {
  if (!data) return null;

  if (data.match_id) {
    return `/match/${data.match_id}`;
  }

  if (data.tournament_id) {
    return `/tournament/${data.tournament_id}`;
  }

  if (data.url) {
    // If standard scheme scoreboard://match/123
    const match = data.url.replace("scoreboard://", "/");
    return match;
  }

  return null;
}
