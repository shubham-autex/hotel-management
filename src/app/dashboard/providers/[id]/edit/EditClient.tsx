"use client";

import { useState, useEffect } from "react";

interface Service {
  _id: string;
  name: string;
}

interface Member {
  name: string;
  phoneNumber?: string;
  isHead?: boolean;
}

interface Provider {
  _id: string;
  name: string;
  service: Service | string;
  members: Member[];
  isActive: boolean;
}

export default function EditClient({ provider }: { provider: Provider }) {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState(provider.name || "");
  const [serviceId, setServiceId] = useState(typeof provider.service === "object" ? provider.service._id : provider.service || "");
  const [members, setMembers] = useState<Member[]>(provider.members && provider.members.length > 0 ? provider.members : [{ name: "", phoneNumber: "", isHead: true }]);
  const [isActive, setIsActive] = useState(provider.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/services?limit=100");
        if (!res.ok) return;
        const data = await res.json();
        setServices(data.items || []);
      } catch {}
    })();
  }, []);

  const addMember = () => setMembers(prev => [...prev, { name: "", phoneNumber: "", isHead: false }]);
  const removeMember = (idx: number) => { if (members.length > 1) setMembers(prev => prev.filter((_, i) => i !== idx)); };
  const updateMember = (idx: number, field: keyof Member, value: any) => setMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/providers/${provider._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, serviceId, members, isActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update provider");
      alert("Provider updated");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Service *</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a service</option>
              {services.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Members</h3>
            <button
              type="button"
              onClick={addMember}
              className="text-purple-600 hover:text-purple-800"
            >
              + Add Member
            </button>
          </div>
          <div className="space-y-4">
            {members.map((m, idx) => (
              <div key={idx} className="grid gap-3 md:grid-cols-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    value={m.name}
                    onChange={(e) => updateMember(idx, 'name', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={m.phoneNumber || ''}
                    onChange={(e) => updateMember(idx, 'phoneNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!m.isHead}
                      onChange={(e) => updateMember(idx, 'isHead', e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Head</span>
                  </label>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      className="text-red-600 hover:text-red-800 text-sm self-start sm:self-auto"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

