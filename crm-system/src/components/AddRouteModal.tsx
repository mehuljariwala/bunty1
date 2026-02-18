"use client";

import { useState, useEffect } from "react";
import { X, Route } from "lucide-react";

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
}

const EMPTY_FORM: RouteFormData = {
  name: "",
  code: "",
  area: "",
  description: "",
  active: true,
};

const INPUT = "w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[0.82rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-white transition-all";

export default function AddRouteModal({ open, onClose, onAdd, editData }: AddRouteModalProps) {
  const [form, setForm] = useState<RouteFormData>(EMPTY_FORM);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) setForm(editData ?? EMPTY_FORM);
  }, [open, editData]);

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
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-[440px] mx-4 shadow-2xl animate-[slideUp_250ms_ease-out]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Route className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-[0.95rem] font-semibold text-slate-900">
              {isEdit ? "Edit Route" : "Add New Route"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Label text="Route Name">
              <input
                type="text"
                placeholder="e.g. BHATAR"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className={INPUT}
              />
            </Label>

            <Label text="Route Code">
              <input
                type="text"
                placeholder="e.g. RT-001"
                value={form.code}
                onChange={(e) => update("code", e.target.value)}
                className={INPUT}
              />
            </Label>
          </div>

          <div className="mt-2.5">
            <Label text="Area / Zone">
              <input
                type="text"
                placeholder="e.g. West Zone"
                value={form.area}
                onChange={(e) => update("area", e.target.value)}
                className={INPUT}
              />
            </Label>
          </div>

          <div className="mt-2.5">
            <Label text="Description">
              <textarea
                placeholder="Brief description of this route..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
                className={`${INPUT} h-auto py-2 resize-none`}
              />
            </Label>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update("active", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-blue-500 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform" />
              </div>
              <div>
                <p className="text-[0.82rem] font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                  Active Route
                </p>
                <p className="text-[0.72rem] text-slate-400">
                  Mark as currently active for deliveries
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-[0.82rem] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
            >
              {isEdit ? "Save Changes" : "Add Route"}
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
      <label className="block text-[0.74rem] font-medium text-slate-600 mb-1">
        {text}
      </label>
      {children}
    </div>
  );
}
