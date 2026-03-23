"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

/* ─── Types ─── */

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  tier: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

/* ─── Provider ─── */

// Lazy-initialize supabase client (avoid module-level execution during SSR)
let _supabase: ReturnType<typeof createBrowserClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createBrowserClient();
  return _supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("id, email, full_name, company, role, bio, avatar_url, tier")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message);
      setProfile(null);
    } else {
      setProfile({
        ...data,
        email: data.email || email || "",
      } as Profile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get initial session
    getSupabase().auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hooks ─── */

export function useUser() {
  const { user, profile, loading, signOut } = useContext(AuthContext);
  return { user, profile, loading, signOut };
}

export function useSession() {
  const { session } = useContext(AuthContext);
  return session;
}

export function useAuth() {
  return useContext(AuthContext);
}
