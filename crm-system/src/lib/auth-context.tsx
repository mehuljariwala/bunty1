"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (isSubAdminRef.current) return;

      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          role: "admin",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || user.role !== "sub-admin") return;

    return onSnapshot(doc(db, "subAdmins", user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const pages = Array.isArray(data.allowedPages) ? (data.allowedPages as string[]) : undefined;
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, allowedPages: pages };
        sessionStorage.setItem(SUB_ADMIN_KEY, JSON.stringify(updated));
        return updated;
      });
    });
  }, [user?.uid, user?.role]);

  async function signIn(email: string, password: string): Promise<AppUser | null> {
    const trimmedEmail = email.trim().toLowerCase();

    const q = query(
      collection(db, "subAdmins"),
      where("email", "==", trimmedEmail),
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();

      if (String(data.password) === password) {
        const appUser: AppUser = {
          uid: d.id,
          displayName: (data.name as string) ?? null,
          email: (data.email as string) ?? null,
          role: "sub-admin",
          allowedPages: Array.isArray(data.allowedPages) ? (data.allowedPages as string[]) : undefined,
        };
        isSubAdminRef.current = true;
        sessionStorage.setItem(SUB_ADMIN_KEY, JSON.stringify(appUser));
        setUser(appUser);
        return appUser;
      }
    }

    isSubAdminRef.current = false;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const adminUser: AppUser = {
      uid: cred.user.uid,
      displayName: cred.user.displayName,
      email: cred.user.email,
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
      await firebaseSignOut(auth);
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
