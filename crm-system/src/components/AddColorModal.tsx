"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

export interface ColorFormData {
  name: string;
  code: string;
  hex: string;
  category: string;
  subCategory: string;
  minStock: string;
  maxStock: string;
  currentStock: string;
  pcsWt: string;
  runningColor: boolean;
}

interface AddColorModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (color: ColorFormData) => void;
  categories: string[];
  subCategories: string[];
  editData?: ColorFormData | null;
}

const EMPTY_FORM: ColorFormData = {
  name: "",
  code: "",
  hex: "#6f9b6f",
  category: "",
  subCategory: "",
  minStock: "",
  maxStock: "",
  currentStock: "",
  pcsWt: "0.070",
  runningColor: false,
};

const INPUT_CLS =
  "w-full h-10 px-3.5 rounded-xl bg-crm-bg/50 border border-crm-border text-crm-text text-[0.82rem] placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all";

const SELECT_ARROW = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236e6b99' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};

const SECTION_TITLE_CLS =
  "text-crm-primary text-[0.68rem] font-bold uppercase tracking-widest mb-3";

export default function AddColorModal({
  open,
  onClose,
  onAdd,
  categories,
  subCategories,
  editData,
}: AddColorModalProps) {
  const [form, setForm] = useState<ColorFormData>(EMPTY_FORM);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) setForm(editData ?? EMPTY_FORM);
  }, [open, editData]);

  if (!open) return null;

  function update<K extends keyof ColorFormData>(field: K, value: ColorFormData[K]) {
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

      <div className="relative bg-crm-card rounded-2xl w-full max-w-[500px] mx-3 sm:mx-4 shadow-2xl animate-[slideUp_250ms_ease-out] max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
          <h2 className="text-[1.1rem] font-bold text-crm-text">
            {isEdit ? "Edit Color" : "Add New Color"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-crm-primary-muted transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-3 overflow-y-auto">

          {/* Section 1 — Color Details */}
          <div className="rounded-xl border border-crm-border p-4">
            <p className={SECTION_TITLE_CLS}>Color Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">

              {/* Name — full width */}
              <div className="sm:col-span-2">
                <FieldLabel text="Color Name" />
                <input
                  type="text"
                  placeholder="e.g. Royal Blue"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  className={INPUT_CLS}
                />
              </div>

              {/* Code + color picker */}
              <div className="sm:col-span-2">
                <FieldLabel text="Color Code" />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. CLR-001"
                    value={form.code}
                    onChange={(e) => update("code", e.target.value)}
                    required
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={form.hex}
                      onChange={(e) => update("hex", e.target.value)}
                      className="sr-only peer"
                      id="color-picker"
                    />
                    <label
                      htmlFor="color-picker"
                      className="block w-10 h-10 rounded-xl border-2 border-crm-border cursor-pointer hover:border-crm-primary peer-focus:ring-2 peer-focus:ring-crm-primary/20 transition-colors"
                      style={{ backgroundColor: form.hex }}
                      title={form.hex}
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <FieldLabel text="Category" />
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                  className={`${INPUT_CLS} appearance-none cursor-pointer`}
                  style={SELECT_ARROW}
                >
                  <option value="" disabled>Select...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sub Category */}
              <div>
                <FieldLabel text="Sub Category" />
                <select
                  value={form.subCategory}
                  onChange={(e) => update("subCategory", e.target.value)}
                  required
                  className={`${INPUT_CLS} appearance-none cursor-pointer`}
                  style={SELECT_ARROW}
                >
                  <option value="" disabled>Select...</option>
                  {subCategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Section 2 — Stock Details */}
          <div className="rounded-xl border border-crm-border p-4">
            <p className={SECTION_TITLE_CLS}>Stock Details</p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">

              <div>
                <FieldLabel text="Min Stock" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.minStock}
                  onChange={(e) => update("minStock", e.target.value)}
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <FieldLabel text="Max Stock" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.maxStock}
                  onChange={(e) => update("maxStock", e.target.value)}
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <FieldLabel text="Current Stock" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.currentStock}
                  onChange={(e) => update("currentStock", e.target.value)}
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <FieldLabel text="PCS WT" />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  placeholder="0.070"
                  value={form.pcsWt}
                  onChange={(e) => update("pcsWt", e.target.value)}
                  required
                  className={INPUT_CLS}
                />
              </div>

            </div>
          </div>

          {/* Section 3 — Status */}
          <div className="rounded-xl border border-crm-border p-4">
            <p className={SECTION_TITLE_CLS}>Status</p>
            <label className="flex items-center gap-3.5 cursor-pointer group w-fit">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={form.runningColor}
                  onChange={(e) => update("runningColor", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-[1.375rem] rounded-full bg-crm-border peer-checked:bg-crm-primary transition-colors duration-200" />
                <div className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-[1.125rem] transition-transform duration-200" />
              </div>
              <div>
                <p className="text-[0.82rem] font-semibold text-crm-text leading-tight">
                  Running Color
                </p>
                <p className="text-[0.72rem] text-crm-text-muted mt-0.5">
                  Mark as currently in production
                </p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-crm-border text-crm-text-muted text-[0.85rem] font-semibold hover:bg-crm-primary-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-crm-primary text-white text-[0.85rem] font-semibold hover:bg-[#4845a2] active:bg-[#3c3a8f] transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {isEdit ? "Save Changes" : "Add Color"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <label className="block text-[0.78rem] font-semibold text-crm-text mb-1.5">
      {text}
    </label>
  );
}
