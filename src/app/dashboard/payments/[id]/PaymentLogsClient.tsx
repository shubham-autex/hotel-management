"use client";

import { useState } from "react";
import { Edit, Trash2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";

type PaymentMode = "cash" | "card" | "bank_transfer" | "upi" | "cheque" | "other";

interface PaymentLog {
  _id: string;
  amount: number;
  date: string;
  type: "received" | "sent";
  mode: PaymentMode;
  notes?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};

export default function PaymentLogsClient({
  paymentId,
  initialLogs,
}: {
  paymentId: string;
  initialLogs: PaymentLog[];
}) {
  const [logs, setLogs] = useState<PaymentLog[]>(initialLogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ amount: number; date: string; type: "received" | "sent"; mode: PaymentMode; notes: string } | null>(null);

  const handleDelete = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}/logs/${logId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Reload logs from server
        const logsRes = await fetch(`/api/payments/${paymentId}/logs`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.items || []);
        } else {
          setLogs((prev) => prev.filter((log) => log._id !== logId));
        }
        alert("Log deleted successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete log");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting log");
    }
  };

  const handleEdit = (log: PaymentLog) => {
    setEditingId(log._id);
    const logDate = new Date(log.date);
    const year = logDate.getFullYear();
    const month = String(logDate.getMonth() + 1).padStart(2, "0");
    const day = String(logDate.getDate()).padStart(2, "0");
    setEditForm({
      amount: log.amount,
      date: `${year}-${month}-${day}`,
      type: log.type,
      mode: log.mode,
      notes: log.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}/logs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        // Reload logs from server to get updated data
        const logsRes = await fetch(`/api/payments/${paymentId}/logs`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.items || []);
        } else {
          // Fallback to local update
          setLogs((prev) =>
            prev.map((log) =>
              log._id === editingId
                ? { ...log, ...editForm, date: new Date(editForm.date).toISOString() }
                : log
            )
          );
        }
        setEditingId(null);
        setEditForm(null);
        alert("Log updated successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to update log");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating log");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transaction logs yet</p>
        <a
          href={`/dashboard/payments/${paymentId}/logs/add`}
          className="mt-2 text-purple-600 hover:text-purple-800 underline"
        >
          Add first log
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {logs.map((log) => (
        <div
          key={log._id}
          className={`border-l-4 p-4 rounded-lg ${
            log.type === "received" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
          }`}
        >
          {editingId === log._id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={editForm?.amount || 0}
                    onChange={(e) => setEditForm({ ...editForm!, amount: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm?.date || ""}
                    onChange={(e) => setEditForm({ ...editForm!, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editForm?.type || "received"}
                  onChange={(e) => setEditForm({ ...editForm!, type: e.target.value as "received" | "sent" })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="received">Received</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={editForm?.mode || "cash"}
                  onChange={(e) => setEditForm({ ...editForm!, mode: e.target.value as PaymentMode })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm?.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm!, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {log.type === "received" ? (
                    <ArrowDownRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-semibold text-gray-900">₹{log.amount.toFixed(2)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    log.type === "received"
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}>
                    {log.type === "received" ? "Received" : "Sent"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-1.5 text-gray-600 hover:bg-white rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(log._id)}
                    className="p-1.5 text-red-600 hover:bg-white rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Date: {formatDateDDMMYYYY(log.date)}</p>
                <p>Mode: {modeLabels[log.mode]}</p>
                {log.notes && <p>Notes: {log.notes}</p>}
                {log.user && (
                  <p className="text-gray-500">
                    Added by {log.user.email} ({log.user.role})
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

