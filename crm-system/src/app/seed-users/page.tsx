"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const SECONDARY_APP = initializeApp(
  {
    apiKey: "AIzaSyBUp2ODHF6k2pVaYY26jY4cyLCbou5kxXg",
    authDomain: "meet-hub-3c03e.firebaseapp.com",
    projectId: "meet-hub-3c03e",
    storageBucket: "meet-hub-3c03e.firebasestorage.app",
    messagingSenderId: "17836504239",
    appId: "1:17836504239:web:0145ed139dafe24462d05a",
  },
  "seed-app"
);
const secondaryAuth = getAuth(SECONDARY_APP);

interface UserEntry {
  name: string;
  email: string;
  password: string;
}

const USERS: UserEntry[] = [
  { name: "anuj", email: "anuj@gmail.com", password: "123456" },
  { name: "imran", email: "imran@gmail.com", password: "123456" },
  { name: "BHAGAT", email: "bhagat@gmail.com", password: "123456" },
  { name: "RADHE", email: "radhe@gmail.com", password: "123456" },
  { name: "PAPPA", email: "pappa@gmail.com", password: "PAPPA1" },
  { name: "sub_admin", email: "sub_admin@gmail.com", password: "sub_admin" },
];

interface LogEntry {
  user: string;
  status: "success" | "error";
  message: string;
}

export default function SeedUsersPage(): React.ReactElement {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function seedUsers(): Promise<void> {
    setRunning(true);
    setLogs([]);
    const results: LogEntry[] = [];

    for (const u of USERS) {
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, u.email, u.password);
        await updateProfile(cred.user, { displayName: u.name });
        await signOut(secondaryAuth);
        results.push({ user: u.name, status: "success", message: `Created ${u.email}` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ user: u.name, status: "error", message: msg });
      }
      setLogs([...results]);
    }

    setRunning(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-crm-bg p-6">
      <div className="w-full max-w-lg bg-crm-card rounded-2xl border border-crm-border shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-crm-border/60">
          <h1 className="text-lg font-bold text-crm-text">Seed Firebase Users</h1>
          <p className="text-xs text-crm-text-muted mt-1">
            Creates {USERS.length} users in Firebase Auth. Run this once.
          </p>
        </div>

        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-crm-text-muted border-b border-crm-border/40">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Email</th>
                <th className="pb-2 font-semibold">Password</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.email} className="border-b border-crm-border/20">
                  <td className="py-2 font-medium text-crm-text">{u.name}</td>
                  <td className="py-2 text-crm-text-muted">{u.email}</td>
                  <td className="py-2 text-crm-text-muted font-mono text-xs">{u.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length > 0 && (
          <div className="px-6 py-3 border-t border-crm-border/40 space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-2 rounded-lg ${
                  log.status === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <span className="font-semibold">{log.user}:</span> {log.message}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-crm-border/60">
          <button
            onClick={seedUsers}
            disabled={running || done}
            className="w-full h-10 rounded-xl bg-crm-primary text-white text-sm font-semibold hover:bg-[#4845a2] active:bg-[#2d2b6b] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {running
              ? "Creating users..."
              : done
                ? "Done!"
                : "Create All Users"}
          </button>
        </div>
      </div>
    </div>
  );
}
