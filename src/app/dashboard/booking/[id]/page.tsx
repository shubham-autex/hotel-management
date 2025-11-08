"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { generateBookingPDF } from "../booking-pdf";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("pages.bookings");
  const tCommon = useTranslations("common");
  const { id } = React.use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(undefined);
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
        // Load company profile
        const cRes = await fetch(`/api/company`, { cache: "no-store" });
        if (cRes.ok) {
          const cData = await cRes.json();
          setCompany(cData || undefined);
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
        return alert(data?.error || t("failedToUpdateStatus"));
      }
      setBooking({ ...booking, status: newStatus });
    } catch (e) {
      console.error(e);
      alert(t("errorUpdatingStatus"));
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("viewTitle")}</h2>
            <p className="text-gray-500">{t("viewBookingInfo")}</p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <a href="/dashboard/booking/list" className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{t("backToList")}</a>
            {booking && <a href={`/dashboard/booking/${booking._id}/edit`} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{tCommon("edit")}</a>}
          </div>
        </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-6 shadow-sm relative">
        <button
          onClick={openAudit}
          title={t("viewAuditLogs")}
          className="absolute top-4 right-4 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          {/* clock icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-700">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.75 5.25a.75.75 0 00-1.5 0v5.25c0 .199.079.39.22.53l3 3a.75.75 0 101.06-1.06l-2.78-2.78V7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-2 absolute top-4 right-14">
          <button
            onClick={() => setPaymentOpen({ type: "received" })}
            className="px-3 py-1.5 text-sm rounded-lg border border-green-600 text-green-700 hover:bg-green-50"
          >{t("acceptPayment")}</button>
          <button
            onClick={() => setPaymentOpen({ type: "refund" })}
            className="px-3 py-1.5 text-sm rounded-lg border border-amber-600 text-amber-700 hover:bg-amber-50"
          >{t("refundPayment")}</button>
          <button
            onClick={async () => {
              if (!booking) return;
              await generateBookingPDF({
                customerName: booking.customerName,
                customerPhone: booking.customerPhone,
                eventName: booking.eventName,
                startAt: booking.startAt,
                endAt: booking.endAt,
                items: booking.items.map(it => ({
                  serviceName: it.serviceName,
                  variantName: it.variantName,
                  priceType: it.priceType,
                  units: it.units,
                  unitPrice: it.unitPrice,
                  total: it.total,
                })),
                status: booking.status,
                payments: payments.map(p => ({ type: p.type, amount: p.amount, mode: p.mode, createdAt: p.createdAt })),
                subtotal: booking.subtotal,
                discountAmount: booking.discountAmount || 0,
                total: booking.total,
                company,
              });
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-purple-600 text-purple-700 hover:bg-purple-50"
          >{t("downloadPDF")}</button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">{t("loadingBooking")}</p>
          </div>
        ) : !booking ? (
          <div className="text-center text-gray-500">{t("bookingNotFound")}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("event")}</div>
                <div className="text-gray-900 font-medium break-words">{booking.eventName}</div>
              </div>
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("status")}</div>
                <div>
                  <select
                    value={(booking.status || 'pending') as any}
                    onChange={(e) => updateBookingStatus(e.target.value as any)}
                    className={`mt-1 md:mt-0 w-full md:w-auto px-2 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-purple-500 ${
                      (booking.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      (booking.status || 'pending') === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      (booking.status || 'pending') === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <option value="pending">{t("pending")}</option>
                    <option value="confirmed">{t("confirmed")}</option>
                    <option value="completed">{t("completed")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                  </select>
                </div>
              </div>
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("customer")}</div>
                <div className="text-gray-900 break-words">{booking.customerName}</div>
              </div>
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("phone")}</div>
                <div className="text-gray-900 break-all">
                  {booking.customerPhone ? (
                    <a href={`tel:${booking.customerPhone}`} className="underline decoration-dotted decoration-gray-400 hover:text-purple-700">
                      {booking.customerPhone}
                    </a>
                  ) : '—'}
                </div>
              </div>
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("start")}</div>
                <div className="text-gray-900 break-words">{new Date(booking.startAt).toLocaleString()}</div>
              </div>
              <div className="md:p-0 md:border-0 p-3 border border-gray-200 rounded-lg">
                <div className="text-xs md:text-sm text-gray-500">{t("end")}</div>
                <div className="text-gray-900 break-words">{new Date(booking.endAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("service")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("variant")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("pricing")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("units")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("unitFixed")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("custom")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("lineDiscount")}</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("total")}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {booking.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top break-words">{it.serviceName}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell break-words">{it.variantName || '—'}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{it.priceType?.split('_').join(' ').toUpperCase()}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{it.units ?? '—'}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{it.unitPrice ?? '—'}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{it.customPrice ?? '—'}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{it.discountAmount ?? 0}</td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">₹{(it.total ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mt-6 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{t("payments")}</h3>
              </div>
              {payments.length === 0 ? (
                <div className="text-sm text-gray-500">{t("noPaymentsYet")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tCommon("type")}</th>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("amount")}</th>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{tCommon("mode")}</th>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{tCommon("date")}</th>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("images")}</th>
                        <th className="px-3 py-2 md:px-4 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{tCommon("notes")}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 md:px-4"> 
                            <span className={`px-2 py-1 rounded-full text-xs ${p.type === 'received' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{p.type}</span>
                          </td>
                          <td className="px-3 py-2 md:px-4">₹{Number(p.amount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 md:px-4 capitalize hidden sm:table-cell">{p.mode}</td>
                          <td className="px-3 py-2 md:px-4 hidden sm:table-cell">{new Date(p.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2 md:px-4 hidden sm:table-cell">
                            <div className="flex gap-2">
                              {(p.images || []).slice(0, 4).map((src: string, idx: number) => (
                                <img key={idx} src={src} alt="img" className="w-10 h-10 object-cover rounded border cursor-zoom-in" onClick={() => setPreviewImg(src)} />
                              ))}
                              {p.images && p.images.length > 4 && (
                                <span className="text-xs text-gray-500">+{p.images.length - 4} more</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 md:px-4 max-w-[260px] truncate hidden sm:table-cell" title={p.notes || ''}>{p.notes || '—'}</td>
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
                        <td className="px-3 py-1 text-gray-600">{t("subtotal")}</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">{t("discountAmount")}</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{discount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">{t("total")}</td>
                        <td className="px-3 py-1 text-right text-gray-900 font-medium">₹{totalAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">{t("totalPaid")}</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{paid.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-600">{t("totalRefunded")}</td>
                        <td className="px-3 py-1 text-right text-gray-900">₹{totalRefunded.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1 text-gray-800">{t("remaining")}</td>
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

      {/* Mobile bottom action bar */}
      {booking && (
        <>
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPaymentOpen({ type: "received" })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-green-600 text-green-700 hover:bg-green-50"
              >{t("payment")}</button>
              <button
                onClick={() => setPaymentOpen({ type: "refund" })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-600 text-amber-700 hover:bg-amber-50"
              >{t("refund")}</button>
              <button
                onClick={async () => {
                  await generateBookingPDF({
                    customerName: booking.customerName,
                    customerPhone: booking.customerPhone,
                    eventName: booking.eventName,
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    items: booking.items.map(it => ({
                      serviceName: it.serviceName,
                      variantName: it.variantName,
                      priceType: it.priceType,
                      units: it.units,
                      unitPrice: it.unitPrice,
                      total: it.total,
                    })),
                    status: booking.status,
                    payments: payments.map(p => ({ type: p.type, amount: p.amount, mode: p.mode, createdAt: p.createdAt })),
                    subtotal: booking.subtotal,
                    discountAmount: booking.discountAmount || 0,
                    total: booking.total,
                    company,
                  });
                }}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-purple-600 text-purple-700 hover:bg-purple-50"
              >{t("download")}</button>
            </div>
          </div>
          {/* Spacer so content isn't hidden behind action bar */}
          <div className="h-16 md:hidden" />
        </>
      )}

      {/* Right side slide-over for audit logs */}
      {auditOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" onClick={() => setAuditOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{t("auditLogs")}</div>
              <button onClick={() => setAuditOpen(false)} className="p-2 rounded hover:bg-gray-50" aria-label={tCommon("close")}>✕</button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {auditLoading ? (
                <div className="text-center py-8 text-gray-500">{t("loading")}</div>
              ) : auditItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t("noAuditLogs")}</div>
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
                          <span className="font-medium">{t("user")}: </span>
                          <span>{log.user?.email || log.user?.id || "—"}{log.user?.role ? ` (${log.user.role})` : ""}</span>
                        </div>
                        <div className="text-gray-700">
                          <span className="font-medium">{t("note")}: </span>
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
              <div className="font-semibold">{paymentOpen.type === "received" ? t("acceptPayment") : t("refundPayment")}</div>
              <button onClick={() => setPaymentOpen(null)} className="p-2 rounded hover:bg-gray-50" aria-label={tCommon("close")}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("amount")}</label>
                <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t("enterAmount")} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{tCommon("mode")}</label>
                <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="cash">{tCommon("cash")}</option>
                  <option value="online">{t("online")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("images")}</label>
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">{t("upload")}</button>
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
                <label className="block text-xs text-gray-500 mb-1">{tCommon("notes")}</label>
                <textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t("optionalNotes")}></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setPaymentOpen(null)} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">{tCommon("cancel")}</button>
                <button
                  onClick={async () => {
                    if (!booking) return;
                    if (!payAmount || Number(payAmount) <= 0) return alert(t("enterValidAmount"));
                    if (payImages.length < 1) return alert(t("addAtLeastOneImage"));
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
                        return alert(data?.error || t("failedToSubmitPayment"));
                      }
                      setPaymentOpen(null);
                      setPayAmount("");
                      setPayMode("cash");
                      setPayImages([]);
                      setPayNotes("");
                      alert(t("paymentRecorded"));
                    } finally {
                      setSubmittingPayment(false);
                    }
                  }}
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-60"
                >
                  {submittingPayment ? t("saving") : paymentOpen.type === "received" ? t("accept") : t("refund")}
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


