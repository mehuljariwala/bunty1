"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
  Loader2,
} from "lucide-react";
import type { SubAdmin } from "@/lib/types";
import {
  subscribeSubAdmins,
  addSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  getNextCsvId,
} from "@/lib/sub-admins";

export default function ManageSubAdminPage(): React.JSX.Element {
  const [admins, setAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formShowPw, setFormShowPw] = useState(false);

  useEffect(() => {
    return subscribeSubAdmins((data) => {
      setAdmins(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        String(a.csvId).includes(q)
    );
  }, [admins, search]);

  function openAdd() {
    setEditingAdmin(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormShowPw(false);
    setModalOpen(true);
  }

  function openEdit(admin: SubAdmin) {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPassword(admin.password);
    setFormShowPw(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingAdmin(null);
  }

  async function handleSave() {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) return;
    setSaving(true);
    try {
      if (editingAdmin) {
        await updateSubAdmin(editingAdmin.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
        });
      } else {
        const nextId = await getNextCsvId();
        await addSubAdmin({
          csvId: nextId,
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          createdAt: new Date().toISOString().split("T")[0],
        });
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSubAdmin(id);
    setDeleteConfirm(null);
  }

  function togglePasswordVisibility(id: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="w-5.5 h-5.5 text-blue-500" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-[1rem] font-bold text-slate-900">Manage Sub Admin</h2>
            <p className="text-[0.72rem] text-slate-400">{admins.length} members</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4" strokeWidth={2.2} />
          Add Sub Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl card-shadow overflow-x-auto">

        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search here..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-100 text-[0.8rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="pl-5 pr-3 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 w-[80px]">Id</th>
                <th className="px-3 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-3 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 w-[160px]">Password</th>
                <th className="px-3 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Email</th>
                <th className="px-5 py-3 text-center text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((admin, idx) => {
                const pwVisible = visiblePasswords.has(admin.id);
                return (
                  <tr
                    key={admin.id}
                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${
                      idx % 2 !== 0 ? "bg-slate-50/25" : ""
                    }`}
                  >
                    <td className="pl-5 pr-3 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[0.72rem] font-bold tabular-nums">
                        {admin.csvId}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[0.7rem] font-bold shrink-0">
                          {admin.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[0.84rem] font-semibold text-slate-800">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.82rem] text-slate-600 font-mono tabular-nums">
                          {pwVisible ? admin.password : "••••••••"}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(admin.id)}
                          className="p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          {pwVisible
                            ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                            : <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[0.82rem] text-slate-600">{admin.email}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(admin)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.8} />
                        </button>

                        {deleteConfirm === admin.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(admin.id)}
                              className="px-2 py-1 rounded-md bg-red-500 text-white text-[0.65rem] font-bold hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[0.65rem] font-bold hover:bg-slate-200 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(admin.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[0.9rem] text-slate-400">No sub admins found</p>
              <p className="text-[0.78rem] text-slate-300 mt-1">Try a different search or add a new sub admin</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-white">
          <p className="text-[0.78rem] text-slate-400">
            Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of {admins.length} sub admins
          </p>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-[fadeIn_150ms_ease-out]">

            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  {editingAdmin
                    ? <Pencil className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.8} />
                    : <UserPlus className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.8} />
                  }
                </div>
                <h3 className="text-[0.95rem] font-bold text-slate-900">
                  {editingAdmin ? "Edit Sub Admin" : "Add Sub Admin"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4.5 h-4.5" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {editingAdmin && (
                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">ID</label>
                  <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center">
                    <span className="text-[0.84rem] font-bold text-slate-500 tabular-nums">{editingAdmin.csvId}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[0.84rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={formShowPw ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-10 px-3 pr-10 rounded-xl bg-white border border-slate-200 text-[0.84rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {formShowPw
                      ? <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                      : <Eye className="w-4 h-4" strokeWidth={1.8} />
                    }
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[0.84rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2">
              <button
                onClick={closeModal}
                className="h-9 px-4 rounded-xl text-[0.82rem] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formName.trim() || !formEmail.trim() || !formPassword.trim() || saving}
                className="flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" strokeWidth={2.2} />
                )}
                {editingAdmin ? "Save Changes" : "Add Sub Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
