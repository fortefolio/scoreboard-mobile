import { supabase } from "@/lib/supabase/client";

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
