"use client";

import { useEffect, useRef, useState } from "react";

type Company = {
  name?: string;
  address?: string;
  contactPersonName?: string;
  contactPhone?: string;
  logo?: string;
  gstin?: string;
};

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<Company>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compress an image file to a base64 data URL with size limit (default 200KB)
  async function compressImageToBase64(file: File, maxBytes: number = 200 * 1024): Promise<string | null> {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    const formats: ("image/webp" | "image/jpeg")[] = ["image/webp", "image/jpeg"];
    for (const mime of formats) {
      let low = 0.3, high = 0.95, best: string | null = null;
      for (let i = 0; i < 8; i++) {
        const q = (low + high) / 2;
        const dataUrl = canvas.toDataURL(mime, q);
        const size = Math.ceil((dataUrl.length * 3) / 4) - 2;
        if (size <= maxBytes) { best = dataUrl; low = q; } else { high = q; }
      }
      if (best) return best;
    }
    const fallback = canvas.toDataURL("image/jpeg", 0.2);
    const size = Math.ceil((fallback.length * 3) / 4) - 2;
    return size <= maxBytes ? fallback : null;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/company", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setCompany(data || {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      if (res.ok) {
        alert("Saved");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
          <p className="text-gray-500">Manage company information (admin only)</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border rounded-lg px-3 py-2" placeholder="Company name" value={company.name || ""} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            <input className="border rounded-lg px-3 py-2" placeholder="Contact person" value={company.contactPersonName || ""} onChange={(e) => setCompany({ ...company, contactPersonName: e.target.value })} />
            <input className="border rounded-lg px-3 py-2" placeholder="Contact phone" value={company.contactPhone || ""} onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })} />
            <input className="border rounded-lg px-3 py-2" placeholder="GSTIN (optional)" value={company.gstin || ""} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} />
            <textarea className="md:col-span-2 border rounded-lg px-3 py-2" placeholder="Address" rows={3} value={company.address || ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs text-gray-500">Logo</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Upload</button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const base64 = await compressImageToBase64(file);
                  if (!base64) return alert("Failed to process image");
                  setCompany((prev) => ({ ...prev, logo: base64 }));
                  e.currentTarget.value = "";
                }} />
                <span className="text-xs text-gray-500">Auto-compress to ≤ 200KB</span>
              </div>
              {company.logo && (
                <div className="flex items-center gap-3">
                  <img src={company.logo} alt="logo" className="w-16 h-16 object-cover rounded border" />
                  <button type="button" onClick={() => setCompany({ ...company, logo: "" })} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={saving} className="px-6 py-2 rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


