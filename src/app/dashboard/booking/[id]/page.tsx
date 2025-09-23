"use client";

import * as React from "react";
import { useEffect, useState } from "react";

type Booking = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  eventName: string;
  startAt: string;
  endAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  items: {
    serviceId: string;
    serviceName: string;
    variantName?: string;
    priceType: "per_unit" | "fixed" | "custom";
    unitPrice?: number;
    units?: number;
    customPrice?: number;
    discountAmount?: number;
    total: number;
  }[];
  subtotal: number;
  discountAmount?: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function BookingViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentOpen, setPaymentOpen] = useState<null | { type: "received" | "refund" }>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMode, setPayMode] = useState<"cash" | "online">("cash");
  const [payImages, setPayImages] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [payNotes, setPayNotes] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Compress an image file to a base64 data URL with size limit
  async function compressImageToBase64(file: File, maxBytes: number): Promise<string | null> {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Keep original size; quality controls file size for JPEG/WebP
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    // Try webp then jpeg, binary search quality
    const tryFormats: ("image/webp" | "image/jpeg")[] = ["image/webp", "image/jpeg"];
    for (const mime of tryFormats) {
      let low = 0.3, high = 0.95, best: string | null = null;
      for (let i = 0; i < 8; i++) {
        const q = (low + high) / 2;
        const dataUrl = canvas.toDataURL(mime, q);
        const size = Math.ceil((dataUrl.length * 3) / 4) - 2; // rough bytes from base64
        if (size <= maxBytes) {
          best = dataUrl;
          low = q;
        } else {
          high = q;
        }
      }
      if (best) return best;
    }
    // Fallback last attempt at very low quality jpeg
    const fallback = canvas.toDataURL("image/jpeg", 0.2);
    const size = Math.ceil((fallback.length * 3) / 4) - 2;
    return size <= maxBytes ? fallback : null;
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings/${id}`);
        if (!res.ok) throw new Error("Failed to load booking");
        const data = await res.json();
        if (ignore) return;
        setBooking(data);
        // Load payments
        const payRes = await fetch(`/api/bookings/${id}/payments`);
        if (payRes.ok) {
          const payData = await payRes.json();
          setPayments(payData.items || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  async function openAudit() {
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/audit`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data = await res.json();
      setAuditItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }

  async function updateBookingStatus(newStatus: "pending" | "confirmed" | "completed" | "cancelled") {
    if (!booking) return;
    try {
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return alert(data?.error || "Failed to update status");
      }
      setBooking({ ...booking, status: newStatus });
    } catch (e) {
      console.error(e);
      alert("Error updating status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
          <p className="text-gray-500">View booking information</p>
        </div>
        <a href="/dashboard/booking/list" className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Back to list</a>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm relative">
        <button
          onClick={openAudit}
          title="View audit logs"
          className="absolute top-4 right-4 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          {/* clock icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-700">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.75 5.25a.75.75 0 00-1.5 0v5.25c0 .199.079.39.22.53l3 3a.75.75 0 101.06-1.06l-2.78-2.78V7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex items-center gap-2 absolute top-4 right-14">
          <button
            onClick={() => setPaymentOpen({ type: "received" })}
            className="px-3 py-1.5 text-sm rounded-lg border border-green-600 text-green-700 hover:bg-green-50"
          >Accept payment</button>
          <button
            onClick={() => setPaymentOpen({ type: "refund" })}
            className="px-3 py-1.5 text-sm rounded-lg border border-amber-600 text-amber-700 hover:bg-amber-50"
          >Refund payment</button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading booking...</p>
          </div>
        ) : !booking ? (
          <div className="text-center text-gray-500">Booking not found</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Event</div>
                <div className="text-gray-900 font-medium">{booking.eventName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div>
                  <select
                    value={(booking.status || 'pending') as any}
                    onChange={(e) => updateBookingStatus(e.target.value as any)}
                    className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-purple-500 ${
                      (booking.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      (booking.status || 'pending') === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      (booking.status || 'pending') === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Customer</div>
                <div className="text-gray-900">{booking.customerName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-gray-900">{booking.customerPhone || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Start</div>
                <div className="text-gray-900">{new Date(booking.startAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End</div>
                <div className="text-gray-900">{new Date(booking.endAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit/Fixed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {booking.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">{it.serviceName}</td>
                      <td className="px-4 py-3">{it.variantName || '—'}</td>
                      <td className="px-4 py-3">{it.priceType?.split('_').join(' ').toUpperCase()}</td>
                      <td className="px-4 py-3">{it.units ?? '—'}</td>
                      <td className="px-4 py-3">{it.unitPrice ?? '—'}</td>
                      <td className="px-4 py-3">{it.customPrice ?? '—'}</td>
                      <td className="px-4 py-3">{it.discountAmount ?? 0}</td>
                      <td className="px-4 py-3">₹{(it.total ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mt-6 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
              </div>
              {payments.length === 0 ? (
                <div className="text-sm text-gray-500">No payments yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p._id}>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${p.type === 'received' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{p.type}</span>
                          </td>
                          <td className="px-4 py-2">₹{Number(p.amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 capitalize">{p.mode}</td>
                          <td className="px-4 py-2">{new Date(p.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              {(p.images || []).slice(0, 4).map((src: string, idx: number) => (
                                <img key={idx} src={src} alt="img" className="w-10 h-10 object-cover rounded border cursor-zoom-in" onClick={() => setPreviewImg(src)} />
                              ))}
                              {p.images && p.images.length > 4 && (
                                <span className="text-xs text-gray-500">+{p.images.length - 4} more</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 max-w-[260px] truncate" title={p.notes || ''}>{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {(() => {
              const subtotal = Number(booking.subtotal || 0);
              const totalAmount = Number(booking.total || 0);
              const discount = Number(booking.discountAmount || 0);
              const received = payments.filter(p => p.type === 'received').reduce((s, p) => s + Number(p.amount || 0), 0);
              const refunded = payments.filter(p => p.type === 'refund').reduce((s, p) => s + Number(p.amount || 0), 0);
              const paid = Math.max(0, received);
              const totalRefunded = Math.max(0, refunded);
              const netPaid = Math.max(0, paid - totalRefunded);
              const remaining = Math.max(0, totalAmount - netPaid);
              return (
                <div className="flex justify-end">
                  <table className="text-sm">
                    <tbody>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">Subtotal</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">Discount</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{discount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">Total</td>
                        <td className="px-3 py-1 text-right text-gray-900 font-medium">₹{totalAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">Total paid</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{paid.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">Total refunded</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{totalRefunded.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-800">Remaining</td>
                        <td className="px-3 py-1 text-right text-gray-900 font-semibold">₹{booking.status !== 'cancelled' ? remaining.toFixed(2) : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Right side slide-over for audit logs */}
      {auditOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" onClick={() => setAuditOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Audit Logs</div>
              <button onClick={() => setAuditOpen(false)} className="p-2 rounded hover:bg-gray-50" aria-label="Close">✕</button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {auditLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : auditItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No audit logs</div>
              ) : (
                <div className="space-y-4">
                  {auditItems.map((log) => (
                    <div key={log._id} className="border rounded-lg">
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
                        <span className="capitalize">{log.action}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="p-3 text-sm space-y-1">
                        <div className="text-gray-700">
                          <span className="font-medium">User: </span>
                          <span>{log.user?.email || log.user?.id || "—"}{log.user?.role ? ` (${log.user.role})` : ""}</span>
                        </div>
                        <div className="text-gray-700">
                          <span className="font-medium">Note: </span>
                          <span>{log.note || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" onClick={() => setPaymentOpen(null)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{paymentOpen.type === "received" ? "Accept payment" : "Refund payment"}</div>
              <button onClick={() => setPaymentOpen(null)} className="p-2 rounded hover:bg-gray-50" aria-label="Close">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount</label>
                <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mode</label>
                <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Images (at least one, auto-compress to ≤ 200KB)</label>
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Upload</button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const results: string[] = [];
                    for (const file of files) {
                      const base64 = await compressImageToBase64(file, 200 * 1024);
                      if (base64) results.push(base64);
                    }
                    setPayImages(prev => [...prev, ...results]);
                    e.currentTarget.value = "";
                  }} />
                </div>
                {payImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {payImages.map((src, idx) => (
                      <div key={idx} className="relative border rounded overflow-hidden">
                        <img src={src} alt="proof" className="w-full h-16 object-cover" />
                        <button type="button" className="absolute top-0 right-0 bg-white/80 px-1 text-xs" onClick={() => setPayImages(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Optional notes"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setPaymentOpen(null)} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={async () => {
                    if (!booking) return;
                    if (!payAmount || Number(payAmount) <= 0) return alert("Enter a valid amount");
                    if (payImages.length < 1) return alert("Add at least one image URL");
                    setSubmittingPayment(true);
                    try {
                      const res = await fetch(`/api/bookings/${booking._id}/payments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: paymentOpen.type,
                          amount: Number(payAmount),
                          mode: payMode,
                          images: payImages,
                          notes: payNotes || undefined,
                        }),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        return alert(data?.error || "Failed to submit payment");
                      }
                      setPaymentOpen(null);
                      setPayAmount("");
                      setPayMode("cash");
                      setPayImages([]);
                      setPayNotes("");
                      alert("Payment recorded");
                    } finally {
                      setSubmittingPayment(false);
                    }
                  }}
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-60"
                >
                  {submittingPayment ? "Saving..." : paymentOpen.type === "received" ? "Accept" : "Refund"}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

      {/* Image preview modal */}
      {previewImg && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewImg(null)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90vw] max-h-[90vh]">
            <img src={previewImg} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded shadow-2xl" />
      </div>
        </div>
      )}

      {/* utilities */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
    </div>
  );
}


