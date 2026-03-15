"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: "admin" | "sub-admin";
  allowedPages?: string[];
}

export function getDefaultPage(user: AppUser): string {
  if (user.role === "admin" || !user.allowedPages) return "/running-orders";
  if (user.allowedPages.length === 0) return "/running-orders";
  return user.allowedPages[0];
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AppUser | null>;
  logout: () => Promise<void>;
}

const SUB_ADMIN_KEY = "bloom_sub_admin";

const AuthContext = createContext<AuthContextValue | null>(null);

function getSavedSubAdmin(): AppUser | null {
  try {
    const saved = sessionStorage.getItem(SUB_ADMIN_KEY);
    if (saved) return JSON.parse(saved) as AppUser;
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isSubAdminRef = useRef(false);

  useEffect(() => {
    const saved = getSavedSubAdmin();
    if (saved) {
      isSubAdminRef.current = true;
      setUser(saved);
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSubAdminRef.current) return;

      if (session?.user) {
        setUser({
          uid: session.user.id,
          displayName: session.user.user_metadata?.full_name ?? null,
          email: session.user.email ?? null,
          role: "admin",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "sub-admin") return;

    const channel = supabase
      .channel(`sub-admin-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sub_admins",
          filter: `id=eq.${user.uid}`,
        },
        (payload) => {
          const data = payload.new;
          const pages = Array.isArray(data.allowed_pages)
            ? (data.allowed_pages as string[])
            : undefined;
          setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, allowedPages: pages };
            sessionStorage.setItem(SUB_ADMIN_KEY, JSON.stringify(updated));
            return updated;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.uid, user?.role]);

  async function signIn(email: string, password: string): Promise<AppUser | null> {
    const trimmedEmail = email.trim().toLowerCase();

    const { data: subAdmins, error: subAdminError } = await supabase
      .from("sub_admins")
      .select("*")
      .eq("email", trimmedEmail)
      .limit(1);

    if (!subAdminError && subAdmins && subAdmins.length > 0) {
      const data = subAdmins[0];

      if (String(data.password) === password) {
        const appUser: AppUser = {
          uid: data.id,
          displayName: (data.name as string) ?? null,
          email: (data.email as string) ?? null,
          role: "sub-admin",
          allowedPages: Array.isArray(data.allowed_pages)
            ? (data.allowed_pages as string[])
            : undefined,
        };
        isSubAdminRef.current = true;
        sessionStorage.setItem(SUB_ADMIN_KEY, JSON.stringify(appUser));
        setUser(appUser);
        return appUser;
      }
    }

    isSubAdminRef.current = false;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw authError ?? new Error("Sign-in failed");
    }

    const adminUser: AppUser = {
      uid: authData.user.id,
      displayName: authData.user.user_metadata?.full_name ?? null,
      email: authData.user.email ?? null,
      role: "admin",
    };
    setUser(adminUser);
    return adminUser;
  }

  async function logout(): Promise<void> {
    const wasSubAdmin = isSubAdminRef.current;
    isSubAdminRef.current = false;
    sessionStorage.removeItem(SUB_ADMIN_KEY);
    setUser(null);
    if (!wasSubAdmin) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
