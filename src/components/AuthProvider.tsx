import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase/client";
import { clearOfflineQueue } from "@/lib/offline/offlineQueue";
import { registerForPushNotificationsAsync } from "@/lib/notifications/push";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastUserIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        registerForPushNotificationsAsync(session.user.id).catch(() => {});
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      const prevUserId = lastUserIdRef.current;
      if (nextUserId) {
        lastUserIdRef.current = nextUserId;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
          clearOfflineQueue().catch(() => {});
        }
        registerForPushNotificationsAsync(session.user.id).catch(() => {});
      }
      if (event === "SIGNED_OUT") {
        lastUserIdRef.current = null;
        clearOfflineQueue().catch(() => {});
      }
      setLoading(false);
    });

    // 3. Handle deep link auth callback (validated scheme/host/path + session guard)
    const isAllowedAuthCallbackUrl = (rawUrl: string): boolean => {
      try {
        const parsed = new URL(rawUrl);
        const normalizedPath = parsed.pathname.replace(/\/+$/, "");
        if (parsed.protocol === "scoreboard:") {
          const full = `${parsed.hostname}${normalizedPath}`;
          return full === "auth/callback" || full === "auth/reset-password";
        }
        if (parsed.protocol === "https:" && (parsed.hostname === "score-board.net" || parsed.hostname === "www.score-board.net")) {
          return normalizedPath === "/auth/callback" || normalizedPath === "/auth/reset-password";
        }
        return false;
      } catch {
        return false;
      }
    };

    const handleAuthUrl = async (url: string | null) => {
      if (!url || !isAllowedAuthCallbackUrl(url)) return;

      try {
        // Query parameters (PKCE): ?code=...
        const queryIndex = url.indexOf("?");
        if (queryIndex !== -1) {
          const query = url.substring(queryIndex + 1).split("#")[0];
          const params = new URLSearchParams(query);
          const code = params.get("code");

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }
        }

        // Hash fragment tokens: only accept when no active session exists to prevent forced session switching
        const hashIndex = url.indexOf("#");
        if (hashIndex !== -1) {
          const { data: current } = await supabase.auth.getSession();
          if (current?.session) {
            console.warn("[AuthProvider] Ignored implicit auth deep link while session is already active.");
            return;
          }
          const hash = url.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            return;
          }
        }
      } catch (err) {
        console.error("[AuthProvider] Failed to process auth deep link:", err);
      }
    };

    // Check cold-start URL
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    // Listen for runtime incoming deep links
    const linkSub = Linking.addEventListener("url", (event) => {
      handleAuthUrl(event.url);
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: "https://score-board.net/auth/callback",
      },
    });
    return { error: error as Error | null };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://score-board.net/auth/reset-password",
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await clearOfflineQueue().catch(() => {});
    const { error } = await supabase.auth.signOut();
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        resetPasswordForEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
