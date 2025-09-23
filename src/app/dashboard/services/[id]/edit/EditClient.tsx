"use client";

import { useState } from "react";
import { PRICE_TYPES } from "@/lib/constants/service";

export default function EditClient({ service }: { service: any }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPatch(payload: any) {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/services/${service._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      alert('Service updated');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded">{error}</div>}
      <ServiceFormClientProxy initial={service} onSubmit={onPatch} saving={saving} />
    </div>
  );
}

function ServiceFormClientProxy({ initial, onSubmit, saving }: { initial: any; onSubmit: (payload: any) => Promise<void>; saving: boolean }) {
  const [state, setState] = useState<any>({
    name: initial.name || '',
    description: initial.description || '',
    variants: initial.variants || [],
    isActive: initial.isActive ?? true,
    allowOverlap: initial.allowOverlap ?? false,
  });

  function update(path: string, value: any) {
    setState((prev: any) => {
      const next = { ...prev };
      (next as any)[path] = value;
      return next;
    });
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    await onSubmit(state);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
          <input value={state.name} onChange={(e) => update('name', e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input value={state.description} onChange={(e) => update('description', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <label className="flex items-center">
          <input type="checkbox" checked={state.isActive} onChange={(e) => update('isActive', e.target.checked)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <span className="ml-2 text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center">
          <input type="checkbox" checked={state.allowOverlap} onChange={(e) => update('allowOverlap', e.target.checked)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <span className="ml-2 text-sm text-gray-700">Allow overlapping bookings</span>
        </label>
      </div>

      <div className="space-y-4">
        {state.variants.map((v: any, vi: number) => (
          <div key={vi} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name *</label>
                <input value={v.name} onChange={(e) => {
                  const next = [...state.variants]; next[vi].name = e.target.value; update('variants', next);
                }} required className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {v.pricingElements.map((pe: any, pi: number) => (
                <div key={pi} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="w-full sm:flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={pe.type} onChange={(e) => { const next = [...state.variants]; next[vi].pricingElements[pi].type = e.target.value; update('variants', next); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      {PRICE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                  </div>
                  {pe.type !== 'custom' && (
                    <div className="w-full sm:flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input type="number" min={0} step={0.01} value={pe.price ?? 0} onChange={(e) => { const next = [...state.variants]; next[vi].pricingElements[pi].price = parseFloat(e.target.value) || 0; update('variants', next); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all duration-200">{saving ? 'Saving...' : 'Save Changes'}</button>
    </form>
  );
}


