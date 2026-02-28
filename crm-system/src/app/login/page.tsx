"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.push("/running-orders");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-crm-sidebar via-[#3a3880] to-crm-sidebar-active p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-crm-accent flex items-center justify-center shadow-lg mb-4">
            <Sprout className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Bloom CRM
          </h1>
          <p className="text-indigo-300 text-sm mt-1">
            Sign in to your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-crm-card rounded-2xl p-6 shadow-xl space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-crm-text-muted uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full h-10 px-3.5 rounded-xl border border-crm-border bg-crm-bg text-sm text-crm-text placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 focus:border-crm-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-crm-text-muted uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-10 px-3.5 pr-10 rounded-xl border border-crm-border bg-crm-bg text-sm text-crm-text placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 focus:border-crm-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-xl bg-crm-primary text-white text-sm font-semibold hover:bg-[#4845a2] active:bg-[#2d2b6b] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
