"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Party, RateValues, RouteDoc } from "@/lib/types";

const RATE_MATERIALS = ["Celtionic", "Litchy", "Polyester", "Multy"] as const;
const RATE_CATEGORIES = ["3 TAR", "5 TAR", "Yarn"] as const;

interface PartyFormData {
  name: string;
  address: string;
  addressGu: string;
  addressHi: string;
  route: string;
  userId: string;
  password: string;
  rates: RateValues;
}

interface AddPartyModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (party: Omit<Party, "id">) => Promise<void>;
  routes?: RouteDoc[];
}

function buildEmptyRates(): RateValues {
  const rates: RateValues = {};
  for (const cat of RATE_CATEGORIES) {
    rates[cat] = {};
    for (const mat of RATE_MATERIALS) {
      rates[cat][mat] = "";
    }
  }
  return rates;
}

const EMPTY_FORM: PartyFormData = {
  name: "",
  address: "",
  addressGu: "",
  addressHi: "",
  route: "",
  userId: "",
  password: "",
  rates: buildEmptyRates(),
};

const ADDRESS_LANGS = [
  { key: "address" as const, lang: "en", label: "English", placeholder: "Full address in English" },
  { key: "addressGu" as const, lang: "gu", label: "ગુજરાતી", placeholder: "સંપૂર્ણ સરનામું ગુજરાતીમાં" },
  { key: "addressHi" as const, lang: "hi", label: "हिन्दी", placeholder: "पूरा पता हिंदी में" },
] as const;

export default function AddPartyModal({ open, onClose, onAdd, routes = [] }: AddPartyModalProps) {
  const activeRoutes = routes.filter((r) => r.active);
  const [form, setForm] = useState<PartyFormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<string>(RATE_CATEGORIES[0]);

  if (!open) return null;

  function updateField(field: keyof Omit<PartyFormData, "rates">, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateRate(category: string, material: string, value: string): void {
    setForm((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [category]: { ...prev.rates[category], [material]: value },
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    await onAdd({
      ...form,
      status: "Enable" as const,
    });
    setForm(EMPTY_FORM);
    setActiveTab(RATE_CATEGORIES[0]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-crm-sidebar/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative bg-crm-card rounded-2xl w-full max-w-[620px] mx-3 sm:mx-4 shadow-2xl animate-[slideUp_250ms_ease-out] max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
          <h2 className="text-[1rem] font-bold text-crm-text tracking-tight">
            Add New Party
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-crm-primary-muted transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-2 space-y-4">

            {/* Section 1: Party Details */}
            <section className="rounded-xl border border-crm-border p-4">
              <SectionTitle>Party Details</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FieldInput
                  label="Name"
                  placeholder="Party name"
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  required
                />
                <div>
                  <label className="block text-[0.78rem] font-semibold text-crm-text mb-1.5">
                    Route
                  </label>
                  <select
                    value={form.route}
                    onChange={(e) => updateField("route", e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-crm-bg/50 border border-crm-border text-crm-text text-[0.84rem] focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary focus:bg-crm-card transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236e6b99' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    <option value="" disabled>Select route</option>
                    {activeRoutes.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                {ADDRESS_LANGS.map((lang) => (
                  <div key={lang.key} className="sm:col-span-2">
                    <label className="block text-[0.78rem] font-semibold text-crm-text mb-1.5">
                      {lang.label === "English" ? "Address (English)" : `Address (${lang.label})`}
                      {lang.key !== "address" && (
                        <span className="text-[0.68rem] font-normal text-crm-text-muted ml-1.5">Optional</span>
                      )}
                    </label>
                    <textarea
                      lang={lang.lang}
                      placeholder={lang.placeholder}
                      value={form[lang.key]}
                      onChange={(e) => updateField(lang.key, e.target.value)}
                      required={lang.key === "address"}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-crm-bg/50 border border-crm-border text-crm-text text-[0.84rem] placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary focus:bg-crm-card transition-all resize-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: Authentication */}
            <section className="rounded-xl border border-crm-border p-4">
              <SectionTitle>Authentication</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FieldInput
                  label="User ID"
                  placeholder="Party user ID"
                  value={form.userId}
                  onChange={(v) => updateField("userId", v)}
                  required
                />
                <FieldInput
                  label="Password"
                  placeholder="Set password"
                  value={form.password}
                  onChange={(v) => updateField("password", v)}
                  type="password"
                  required
                />
              </div>
            </section>

            {/* Section 3: Rate Card */}
            <section className="rounded-xl border border-crm-border p-4">
              <SectionTitle>Rate Card</SectionTitle>

              {/* Category tabs */}
              <div className="flex rounded-lg bg-crm-bg/50 border border-crm-border overflow-hidden mb-3">
                {RATE_CATEGORIES.map((cat) => {
                  const filled = RATE_MATERIALS.filter(
                    (m) => form.rates[cat]?.[m] !== ""
                  ).length;
                  const isActive = activeTab === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveTab(cat)}
                      className={`flex-1 py-2 text-[0.78rem] font-semibold transition-all relative flex items-center justify-center gap-1.5 ${
                        isActive
                          ? "bg-crm-primary-muted text-crm-primary"
                          : "text-crm-text-muted hover:text-crm-text hover:bg-crm-primary-muted/40"
                      }`}
                    >
                      {cat}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          filled === RATE_MATERIALS.length
                            ? "bg-crm-primary"
                            : filled > 0
                              ? "bg-crm-accent"
                              : "bg-crm-border"
                        }`}
                      />
                      {isActive && (
                        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-crm-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Rate inputs grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {RATE_MATERIALS.map((material) => (
                  <div key={material} className="flex items-center gap-2">
                    <span className="w-[70px] text-[0.76rem] font-semibold text-crm-text-muted shrink-0">
                      {material}
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.76rem] text-crm-text-muted/60 select-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.rates[activeTab]?.[material] ?? ""}
                        onChange={(e) => updateRate(activeTab, material, e.target.value)}
                        className="w-full h-9 pl-6 pr-2.5 rounded-xl bg-crm-bg/50 border border-crm-border text-[0.82rem] text-crm-text placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 pt-3 pb-4 sm:pb-5 shrink-0 border-t border-crm-border mt-1">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-crm-border text-crm-text-muted font-semibold text-[0.84rem] hover:bg-crm-primary-muted hover:text-crm-primary hover:border-crm-primary/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 rounded-xl bg-crm-primary text-white font-semibold text-[0.84rem] hover:bg-crm-primary-light active:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Create Party
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-crm-primary text-[0.68rem] font-bold tracking-widest uppercase mb-3">
      {children}
    </p>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[0.78rem] font-semibold text-crm-text mb-1.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-10 px-3.5 rounded-xl bg-crm-bg/50 border border-crm-border text-crm-text text-[0.84rem] placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary focus:bg-crm-card transition-all"
      />
    </div>
  );
}
