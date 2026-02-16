"use client";

import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import type { Party, RateValues } from "@/lib/types";

const RATE_MATERIALS = ["Celtionic", "Litchy", "Polyester", "Multy"] as const;
const RATE_CATEGORIES = ["3 TAR", "5 TAR", "Yarn"] as const;

interface PartyFormData {
  name: string;
  address: string;
  route: string;
  userId: string;
  password: string;
  rates: RateValues;
}

interface AddPartyModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (party: Omit<Party, "id">) => Promise<void>;
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
  route: "",
  userId: "",
  password: "",
  rates: buildEmptyRates(),
};

export default function AddPartyModal({ open, onClose, onAdd }: AddPartyModalProps) {
  const [form, setForm] = useState<PartyFormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<string>(RATE_CATEGORIES[0]);

  if (!open) return null;

  function updateField(field: keyof Omit<PartyFormData, "rates">, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateRate(category: string, material: string, value: string) {
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
        className="absolute inset-0 bg-slate-warm-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-[620px] mx-4 shadow-2xl animate-[slideUp_250ms_ease-out]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-sage-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-[0.95rem] font-semibold text-slate-warm-900">
              Add New Party
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors text-slate-warm-400 hover:text-slate-warm-600"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
            <SectionLabel className="col-span-2">Basic Info</SectionLabel>
            <Input label="Name" placeholder="Party name" value={form.name} onChange={(v) => updateField("name", v)} required />
            <Input label="Route" placeholder="Route code" value={form.route} onChange={(v) => updateField("route", v)} required />
            <div className="col-span-2">
              <Input label="Address" placeholder="Full address" value={form.address} onChange={(v) => updateField("address", v)} required />
            </div>

            <SectionLabel className="col-span-2 mt-1">Authentication</SectionLabel>
            <Input label="User ID" placeholder="Party User ID" value={form.userId} onChange={(v) => updateField("userId", v)} required />
            <Input label="Password" placeholder="Set password" value={form.password} onChange={(v) => updateField("password", v)} type="password" required />
          </div>

          <SectionLabel>Rate Card</SectionLabel>
          <div className="bg-cream-50 rounded-xl border border-slate-warm-100 overflow-hidden">
            <div className="flex border-b border-slate-warm-100">
              {RATE_CATEGORIES.map((cat) => {
                const filled = RATE_MATERIALS.filter(
                  (m) => form.rates[cat]?.[m] !== ""
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTab(cat)}
                    className={`flex-1 py-2 text-[0.78rem] font-medium transition-all relative flex items-center justify-center gap-1.5 ${
                      activeTab === cat
                        ? "text-sage-700 bg-white"
                        : "text-slate-warm-400 hover:text-slate-warm-600 hover:bg-cream-100"
                    }`}
                  >
                    {cat}
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        filled === RATE_MATERIALS.length
                          ? "bg-sage-400"
                          : filled > 0
                            ? "bg-coral-400"
                            : "bg-slate-warm-200"
                      }`}
                    />
                    {activeTab === cat && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-sage-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3">
              {RATE_MATERIALS.map((material) => (
                <div key={material} className="flex items-center gap-2">
                  <span className="w-[72px] text-[0.76rem] font-medium text-slate-warm-600 shrink-0">
                    {material}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.74rem] text-slate-warm-300">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.rates[activeTab]?.[material] ?? ""}
                      onChange={(e) => updateRate(activeTab, material, e.target.value)}
                      className="w-full h-8 pl-6 pr-2 rounded-lg bg-white border border-slate-warm-100 text-[0.82rem] text-slate-warm-800 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-warm-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-[0.82rem] font-medium text-slate-warm-600 hover:bg-cream-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 active:bg-sage-700 transition-colors shadow-sm"
            >
              Add Party
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[0.65rem] font-semibold uppercase tracking-widest text-slate-warm-400 mb-2 ${className}`}>
      {children}
    </p>
  );
}

function Input({
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
      <label className="block text-[0.74rem] font-medium text-slate-warm-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-9 px-3 rounded-lg bg-cream-50 border border-slate-warm-100 text-[0.82rem] text-slate-warm-800 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 focus:bg-white transition-all"
      />
    </div>
  );
}
