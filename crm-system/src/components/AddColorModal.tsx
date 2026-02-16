"use client";

import { useState, useEffect } from "react";
import { X, Palette } from "lucide-react";

export interface ColorFormData {
  name: string;
  code: string;
  hex: string;
  category: string;
  subCategory: string;
  minStock: string;
  maxStock: string;
  currentStock: string;
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
  runningColor: false,
};

const INPUT = "w-full h-9 px-3 rounded-lg bg-cream-50 border border-slate-warm-100 text-[0.82rem] text-slate-warm-800 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 focus:bg-white transition-all";

const SELECT_ARROW = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238a877e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};

export default function AddColorModal({ open, onClose, onAdd, categories, subCategories, editData }: AddColorModalProps) {
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
        className="absolute inset-0 bg-slate-warm-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-[480px] mx-4 shadow-2xl animate-[slideUp_250ms_ease-out]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
              <Palette className="w-4 h-4 text-sage-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-[0.95rem] font-semibold text-slate-warm-900">
              {isEdit ? "Edit Color" : "Add New Color"}
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Label text="Color Name">
              <input
                type="text"
                placeholder="e.g. Royal Blue"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className={INPUT}
              />
            </Label>

            <Label text="Color Code">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. CLR-001"
                  value={form.code}
                  onChange={(e) => update("code", e.target.value)}
                  required
                  className={`${INPUT} flex-1`}
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
                    className="block w-9 h-9 rounded-lg border-2 border-slate-warm-100 cursor-pointer hover:border-sage-300 peer-focus:ring-2 peer-focus:ring-sage-200 transition-colors"
                    style={{ backgroundColor: form.hex }}
                    title={form.hex}
                  />
                </div>
              </div>
            </Label>

            <Label text="Category">
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
                className={`${INPUT} appearance-none cursor-pointer`}
                style={SELECT_ARROW}
              >
                <option value="" disabled>Select...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Label>

            <Label text="Sub Category">
              <select
                value={form.subCategory}
                onChange={(e) => update("subCategory", e.target.value)}
                required
                className={`${INPUT} appearance-none cursor-pointer`}
                style={SELECT_ARROW}
              >
                <option value="" disabled>Select...</option>
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </Label>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-warm-100">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-warm-400 mb-2">
              Stock Details
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Label text="Min Stock">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.minStock}
                  onChange={(e) => update("minStock", e.target.value)}
                  required
                  className={INPUT}
                />
              </Label>
              <Label text="Max Stock">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.maxStock}
                  onChange={(e) => update("maxStock", e.target.value)}
                  required
                  className={INPUT}
                />
              </Label>
              <Label text="Current Stock">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.currentStock}
                  onChange={(e) => update("currentStock", e.target.value)}
                  required
                  className={INPUT}
                />
              </Label>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-warm-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.runningColor}
                  onChange={(e) => update("runningColor", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-slate-warm-200 peer-checked:bg-sage-500 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform" />
              </div>
              <div>
                <p className="text-[0.82rem] font-medium text-slate-warm-800 group-hover:text-sage-700 transition-colors">
                  Running Color
                </p>
                <p className="text-[0.72rem] text-slate-warm-400">
                  Mark as currently in production
                </p>
              </div>
            </label>
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
              {isEdit ? "Save Changes" : "Add Color"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[0.74rem] font-medium text-slate-warm-600 mb-1">
        {text}
      </label>
      {children}
    </div>
  );
}
