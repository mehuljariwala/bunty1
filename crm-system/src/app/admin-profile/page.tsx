"use client";

import { useState } from "react";
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  Building2,
  Shield,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  Key,
  Clock,
  Globe,
} from "lucide-react";

const initialProfile = {
  name: "Jane Doe",
  email: "jane@bloom.io",
  phone: "+1 (555) 123-4567",
  role: "Super Admin",
  company: "Bloom CRM",
  location: "San Francisco, CA",
  timezone: "PST (UTC-8)",
  avatar: "JD",
  joinedDate: "Jan 15, 2024",
  lastLogin: "Feb 15, 2026 — 9:32 AM",
};

type FieldKey = "name" | "email" | "phone" | "company" | "location" | "timezone";

const profileFields: { key: FieldKey; label: string; icon: typeof Mail }[] = [
  { key: "name", label: "Full Name", icon: Shield },
  { key: "email", label: "Email Address", icon: Mail },
  { key: "phone", label: "Phone Number", icon: Phone },
  { key: "company", label: "Company", icon: Building2 },
  { key: "location", label: "Location", icon: MapPin },
  { key: "timezone", label: "Timezone", icon: Globe },
];

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  function startEdit(key: FieldKey) {
    setEditing(key);
    setDraft(profile[key]);
  }

  function saveEdit() {
    if (!editing || !draft.trim()) return;
    setProfile((p) => ({ ...p, [editing]: draft.trim() }));
    setEditing(null);
    setDraft("");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  function savePassword() {
    if (!currentPw || !newPw || newPw !== confirmPw || newPw.length < 6) return;
    setPwSaved(true);
    setTimeout(() => {
      setChangingPassword(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setShowCurrentPw(false);
      setShowNewPw(false);
      setPwSaved(false);
    }, 1200);
  }

  const pwValid = currentPw.length > 0 && newPw.length >= 6 && newPw === confirmPw;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-blue-100 via-blue-50 to-slate-100 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-blue-200 flex items-center justify-center text-[1.6rem] font-bold text-blue-700 ring-4 ring-white shadow-md">
                {profile.avatar}
              </div>
              <button className="absolute inset-0 rounded-2xl bg-slate-900/0 group-hover:bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <Camera className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-6 px-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[1.3rem] font-semibold text-slate-900 tracking-tight">
                {profile.name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[0.78rem] font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {profile.role}
                </span>
                <span className="text-[0.76rem] text-slate-400">
                  Joined {profile.joinedDate}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[0.74rem] text-slate-400">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
              Last login: {profile.lastLogin}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-[0.95rem] font-semibold text-slate-800">
              Profile Information
            </h3>
            <p className="text-[0.76rem] text-slate-400 mt-0.5">
              Click the edit icon on any field to update your details
            </p>
          </div>

          <div className="divide-y divide-slate-50">
            {profileFields.map(({ key, label, icon: Icon }) => {
              const isEditing = editing === key;
              return (
                <div
                  key={key}
                  className="flex items-center gap-4 px-6 py-4 group hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400 mb-0.5">
                      {label}
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 h-8 px-3 rounded-lg border border-blue-200 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                        />
                        <button
                          onClick={saveEdit}
                          disabled={!draft.trim()}
                          className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[0.84rem] text-slate-800 truncate">
                        {profile[key]}
                      </p>
                    )}
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => startEdit(key)}
                      className="p-2 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl card-shadow">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                Password & Security
              </h3>
            </div>

            <div className="px-6 py-5">
              {!changingPassword ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400 mb-1">
                      Password
                    </p>
                    <p className="text-[0.84rem] text-slate-800 tracking-widest">
                      ••••••••••
                    </p>
                  </div>
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="w-full h-9 rounded-xl border border-blue-200 text-[0.82rem] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              ) : pwSaved ? (
                <div className="flex flex-col items-center py-4 gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Check className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-[0.84rem] font-medium text-blue-600">
                    Password updated
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full h-9 px-3 pr-9 rounded-lg border border-slate-200 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPw ? (
                          <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                        ) : (
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full h-9 px-3 pr-9 rounded-lg border border-slate-200 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPw ? (
                          <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                        ) : (
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                    {newPw.length > 0 && newPw.length < 6 && (
                      <p className="text-[0.7rem] text-orange-500 mt-1">
                        Minimum 6 characters
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                    />
                    {confirmPw.length > 0 && newPw !== confirmPw && (
                      <p className="text-[0.7rem] text-orange-500 mt-1">
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={savePassword}
                      disabled={!pwValid}
                      className="flex-1 h-9 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Update Password
                    </button>
                    <button
                      onClick={() => {
                        setChangingPassword(false);
                        setCurrentPw("");
                        setNewPw("");
                        setConfirmPw("");
                      }}
                      className="h-9 px-4 rounded-xl border border-slate-200 text-[0.82rem] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl card-shadow">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-[0.95rem] font-semibold text-slate-800">
                Account Details
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.76rem] text-slate-400">Role</span>
                <span className="text-[0.78rem] font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {profile.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.76rem] text-slate-400">Member Since</span>
                <span className="text-[0.78rem] font-medium text-slate-700">
                  {profile.joinedDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.76rem] text-slate-400">Status</span>
                <span className="text-[0.72rem] font-medium bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.76rem] text-slate-400">2FA</span>
                <span className="text-[0.72rem] font-medium bg-orange-400/10 text-orange-500 px-2.5 py-0.5 rounded-full">
                  Disabled
                </span>
              </div>
            </div>
          </div>

          <button className="w-full h-10 rounded-xl border border-orange-200 text-[0.82rem] font-medium text-orange-500 hover:bg-orange-400/5 transition-colors">
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
