"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { DeviceInfo } from "@/lib/types";

interface AdminPanelProps {
  apiKey: string;
}

interface FormState {
  device: string;
  site: string;
  label: string;
  location: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  device: "",
  site: "",
  label: "",
  location: "",
  active: true,
};

function mask(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export function AdminPanel({ apiKey }: AdminPanelProps) {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const json = (await res.json()) as { devices?: DeviceInfo[] };
      setDevices(json.devices ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(device: DeviceInfo) {
    setEditing(device.device);
    setForm({
      device: device.device,
      site: device.site ?? "",
      label: device.label ?? "",
      location: device.location ?? "",
      active: device.active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/devices", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(json.error ?? "Gagal menyimpan device.");
        return;
      }
      setMessage(editing ? "Device diperbarui." : "Device ditambahkan.");
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(device: string) {
    if (!window.confirm(`Hapus device "${device}" dari registry?`)) return;
    await fetch(`/api/devices?device=${encodeURIComponent(device)}`, {
      method: "DELETE",
    });
    await load();
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage("API key disalin ke clipboard.");
    } catch {
      setMessage("Gagal menyalin, salin manual dari .env.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Admin
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Kelola registry device dan lihat kredensial API.
          </p>
        </div>
        <button type="button" onClick={handleLogout} className="btn-ghost">
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-white">API Key Ingest</h2>
        <p className="mt-1 text-xs text-slate-400">
          Kirim data dengan header{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">
            X-API-KEY
          </code>
          . Nilai ini diatur lewat env <code>WEATHER_API_KEY</code>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 font-mono text-sm text-cyan-200">
            {showKey ? apiKey || "(belum diset)" : mask(apiKey)}
          </code>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showKey ? "Sembunyikan" : "Tampilkan"}
          </button>
          <button type="button" className="btn-ghost" onClick={copyKey}>
            <Copy className="h-4 w-4" />
            Salin
          </button>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {editing ? `Edit device: ${editing}` : "Tambah device"}
          </h2>
          {editing && (
            <button type="button" onClick={resetForm} className="btn-ghost">
              <X className="h-4 w-4" />
              Batal
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="label">Device ID *</label>
            <input
              className="input mt-1.5"
              required
              disabled={Boolean(editing)}
              value={form.device}
              onChange={(e) => setForm({ ...form, device: e.target.value })}
              placeholder="REMOTE-STATION-01"
            />
          </div>
          <div>
            <label className="label">Site</label>
            <input
              className="input mt-1.5"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              placeholder="RemoteTestSite"
            />
          </div>
          <div>
            <label className="label">Label</label>
            <input
              className="input mt-1.5"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Stasiun Utara"
            />
          </div>
          <div>
            <label className="label">Lokasi</label>
            <input
              className="input mt-1.5"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Malang, Jawa Timur"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-ink-900"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Device aktif
          </label>

          <div className="sm:col-span-2 lg:col-span-3 lg:justify-self-end">
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editing ? "Simpan perubahan" : "Tambah device"}
            </button>
          </div>
        </form>

        {message && (
          <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">
            {message}
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Registry Device</h2>
        </div>
        {loading ? (
          <div className="grid h-32 place-items-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="grid h-32 place-items-center text-sm text-slate-500">
            Belum ada device.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Device</th>
                  <th className="px-5 py-3 font-medium">Label</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Lokasi</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Update</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.device}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-cyan-200">
                      {device.device}
                    </td>
                    <td className="px-5 py-3 text-slate-200">
                      {device.label || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {device.site || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {device.location || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`chip ${
                          device.online
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                            : "border-slate-300/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {device.online ? "online" : "offline"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {relativeTime(device.lastSeen)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(device)}
                          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-cyan-200"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(device.device)}
                          className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-300"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
