"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

export interface RouteFormData {
  name: string;
  code: string;
  area: string;
  description: string;
  active: boolean;
}

interface AddRouteModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (route: RouteFormData) => void;
  editData?: RouteFormData | null;
  existingCodes?: string[];
}

const EMPTY_FORM: RouteFormData = {
  name: "",
  code: "",
  area: "",
  description: "",
  active: true,
};

const INPUT =
  "w-full h-10 px-3.5 rounded-xl bg-crm-bg/50 border border-crm-border text-crm-text text-[0.82rem] placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all";

const SECTION_TITLE =
  "text-crm-primary text-[0.68rem] font-bold uppercase tracking-widest mb-3";

function generateNextCode(existingCodes: string[]): string {
  let max = 0;
  for (const code of existingCodes) {
    const match = code.match(/^RT-(\d+)$/i);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `RT-${String(max + 1).padStart(3, "0")}`;
}

export default function AddRouteModal({ open, onClose, onAdd, editData, existingCodes = [] }: AddRouteModalProps) {
  const [form, setForm] = useState<RouteFormData>(EMPTY_FORM);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm(editData);
      } else {
        setForm({ ...EMPTY_FORM, code: generateNextCode(existingCodes) });
      }
    }
  }, [open, editData, existingCodes]);

  if (!open) return null;

  function update<K extends keyof RouteFormData>(field: K, value: RouteFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(form);
    setForm(EMPTY_FORM);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-crm-sidebar/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative bg-crm-card rounded-2xl w-full max-w-[440px] mx-4 shadow-2xl animate-[slideUp_250ms_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[1.1rem] font-bold text-crm-text">
            {isEdit ? "Edit Route" : "Add New Route"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-crm-primary-muted transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3">

          {/* Section 1 — Route Details */}
          <div className="rounded-xl border border-crm-border p-4">
            <p className={SECTION_TITLE}>Route Details</p>

            <div className="flex flex-col gap-3">
              <FieldLabel text="Route Name">
                <input
                  type="text"
                  placeholder="e.g. BHATAR"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  className={INPUT}
                />
              </FieldLabel>

              <FieldLabel text="Area / Zone">
                <input
                  type="text"
                  placeholder="e.g. West Zone"
                  value={form.area}
                  onChange={(e) => update("area", e.target.value)}
                  className={INPUT}
                />
              </FieldLabel>

              <FieldLabel text="Description">
                <textarea
                  placeholder="Brief description of this route..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                  className={`${INPUT} h-auto py-2.5 resize-none`}
                />
              </FieldLabel>
            </div>
          </div>

          {/* Section 2 — Status */}
          <div className="rounded-xl border border-crm-border p-4">
            <p className={SECTION_TITLE}>Status</p>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update("active", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-crm-border peer-checked:bg-crm-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform" />
              </div>
              <div>
                <p className="text-[0.82rem] font-semibold text-crm-text">
                  Active Route
                </p>
                <p className="text-[0.72rem] text-crm-text-muted">
                  Mark as currently active for deliveries
                </p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-crm-border text-crm-text-muted font-semibold text-[0.85rem] hover:bg-crm-primary-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-crm-primary text-white font-semibold text-[0.85rem] hover:bg-[#4845a2] active:bg-[#3a3890] transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {isEdit ? "Save Changes" : "Add Route"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[0.78rem] font-semibold text-crm-text mb-1.5">
        {text}
      </label>
      {children}
    </div>
  );
}
