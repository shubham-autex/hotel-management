"use client";

import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { generateQuotationPDF } from "./quotation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTranslations } from "next-intl";

type PriceType = "per_unit" | "fixed" | "custom" | "per_hour";

type ServiceVariant = {
  name: string;
  pricingElements: { type: PriceType; price?: number }[];
};

type CompanyProfile = {
  name?: string;
  address?: string;
  contactPersonName?: string;
  contactPhone?: string;
  logo?: string;
  gstin?: string;
};

type Service = {
  _id: string;
  name: string;
  allowOverlap?: boolean;
  variants: ServiceVariant[];
};

type AvailabilityResponse = {
  nonOverlapServices: Service[];
  overlapAllowedServices: Service[];
};

type LineItem = {
  key: string;
  serviceId?: string;
  serviceName?: string;
  allowOverlap?: boolean;
  variantName?: string;
  priceType: PriceType;
  unitPrice?: number;
  units?: number;
  customPrice?: number;
  discountAmount?: number;
  total: number;
};

function formatISO(dt?: string) {
  return dt ?? "";
}

export default function BookingForm() {
  const t = useTranslations("pages.bookings");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  // New date/time selection states
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>(""); // HH:mm (24h)
  const [endDate, setEndDate] = useState<string>(""); // YYYY-MM-DD
  const [endTime, setEndTime] = useState<string>(""); // HH:mm (24h)
  const [services, setServices] = useState<Service[]>([]);
  const [overlapServices, setOverlapServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [bookingDiscount, setBookingDiscount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<CompanyProfile | undefined>(undefined);

  const canQuery = startAt && endAt;

  useEffect(() => {
    if (!canQuery) return;
    let ignore = false;
    (async () => {
      try {
        setLoadingServices(true);
        const params = new URLSearchParams({ startAt, endAt });
        const res = await fetch(`/api/bookings/availability?${params.toString()}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: AvailabilityResponse = await res.json();
        if (ignore) return;
        setServices(data.nonOverlapServices);
        setOverlapServices(data.overlapAllowedServices);
      } finally {
        setLoadingServices(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [canQuery, startAt, endAt]);

  // Load company profile for quotation header
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/company`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (ignore) return;
        setCompany(data || undefined);
      } catch {}
    })();
    return () => { ignore = true; };
  }, []);

  // Helpers for date/time dropdowns
  function toYmd(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function toDmyDisplay(ymd: string) {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
  }
  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const startDateOptions = useMemo(() => {
    const results: string[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 2); // up to 2 years ahead
    for (
      const dt = new Date(start);
      dt <= end;
      dt.setDate(dt.getDate() + 1)
    ) {
      results.push(toYmd(new Date(dt)));
    }
    return results;
  }, []);
  const endDateOptions = useMemo(() => {
    if (!startDate) return [] as string[];
    const results: string[] = [];
    const start = new Date(startDate + "T00:00:00");
    for (let i = 0; i <= 30; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      results.push(toYmd(dt));
    }
    return results;
  }, [startDate]);
  const timeOptions = useMemo(() => {
    const results: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      const hour24 = String(h).padStart(2, "0");
      const labelHour12 = ((h % 12) || 12).toString().padStart(2, "0");
      const ampm = h < 12 ? "AM" : "PM";
      const value = `${hour24}:00`;
      const label = `${labelHour12}:00 ${ampm}`;
      results.push({ value, label });
    }
    return results;
  }, []);

  // Searchable select component
  function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    disabled?: boolean;
  }) {
    const selected = options.find((o) => o.value === value);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);
    useEffect(() => {
      // Match input to selected label when value changes externally
      setQuery("");
    }, [value]);
    const updateMenuPos = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    };
    useLayoutEffect(() => {
      if (!open) return;
      updateMenuPos();
      const handler = () => updateMenuPos();
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
      };
    }, [open]);
    return (
      <div className="relative">
        <input
          ref={inputRef}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none"
          placeholder={placeholder}
          value={query || selected?.label || ""}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onBlur={() => {
            // Delay to allow click selection
            setTimeout(() => setOpen(false), 100);
          }}
        />
        {open && !disabled && createPortal(
          <div
            className="z-50 max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg"
            style={{ position: "absolute", top: 0, left: 0, visibility: "hidden" }}
          />,
          document.body
        )}
        {open && !disabled && createPortal(
          <div
            className="z-50 max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg"
            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{t("noBookingsFound")}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${opt.value === value ? "bg-gray-50" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
      </div>
    );
  }

  const startDateOptionObjs = useMemo(() => startDateOptions.map((d) => ({ value: d, label: toDmyDisplay(d) })), [startDateOptions]);
  const endDateOptionObjs = useMemo(() => endDateOptions.map((d) => ({ value: d, label: toDmyDisplay(d) })), [endDateOptions]);

  // Compose startAt/endAt ISO strings whenever parts change
  useEffect(() => {
    if (!startDate || !startTime) {
      setStartAt("");
    } else {
      const s = new Date(`${startDate}T${startTime}:00`);
      setStartAt(s.toISOString());
    }
  }, [startDate, startTime]);

  useEffect(() => {
    // Only set endAt when both start and end selections are present and valid
    if (!startDate || !startTime) {
      setEndAt("");
      return;
    }
    if (!endDate || !endTime) {
      setEndAt("");
      return;
    }
    const startDt = new Date(`${startDate}T${startTime}:00`);
    const endDt = new Date(`${endDate}T${endTime}:00`);
    if (endDt > startDt) {
      setEndAt(endDt.toISOString());
    } else {
      setEndAt("");
    }
  }, [startDate, startTime, endDate, endTime]);

  function recalcItemTotal(li: LineItem): number {
    const discount = li.discountAmount ?? 0;
    if (li.priceType === "fixed") {
      const price = li.unitPrice ?? 0;
      return Math.max(0, price - discount);
    }
    if (li.priceType === "per_unit" || li.priceType === "per_hour") {
      const price = (li.unitPrice ?? 0) * (li.units ?? 0);
      return Math.max(0, price - discount);
    }
    return Math.max(0, (li.customPrice ?? 0) - discount);
  }

  const subtotal = useMemo(() => items.reduce((s, it) => s + (it.total || 0), 0), [items]);
  const totalLineDiscount = useMemo(() => items.reduce((s, it) => s + (it.discountAmount ?? 0), 0), [items]);
  const total = useMemo(() => Math.max(0, subtotal - (bookingDiscount || 0)), [subtotal, bookingDiscount]);

  function formatPriceTypeDisplay(value: string): string {
    return value.replace(/_/g, " ").toUpperCase();
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), priceType: "fixed", total: 0 },
    ]);
  }
  function removeRow(key: string) {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }

  function onSelectService(key: string, serviceId: string) {
    const svc = [...services, ...overlapServices].find((s) => s._id === serviceId);
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const variantName = svc?.variants?.[0]?.name;
      const defaultPricing = svc?.variants?.[0]?.pricingElements?.[0];
      const priceType = defaultPricing?.type ?? "fixed";
      const unitPrice = defaultPricing?.price ?? 0;
      const updated: LineItem = {
        ...it,
        serviceId,
        serviceName: svc?.name,
        allowOverlap: !!svc?.allowOverlap,
        variantName,
        priceType,
        unitPrice,
      };
      updated.total = recalcItemTotal(updated);
      return updated;
    }));
  }

  function onChangeVariant(key: string, variantName: string) {
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const svc = [...services, ...overlapServices].find((s) => s._id === it.serviceId);
      const variant = svc?.variants.find((v) => v.name === variantName);
      const pr = variant?.pricingElements?.[0];
      const priceType = pr?.type ?? it.priceType;
      const unitPrice = pr?.price ?? it.unitPrice;
      // Reset fields according to pricing type
      const updated: LineItem = {
        ...it,
        variantName,
        priceType,
        unitPrice: priceType === "custom" ? undefined : unitPrice,
        units: priceType === "per_unit" ? it.units ?? 1 : undefined,
        customPrice: priceType === "custom" ? (it.customPrice ?? 0) : undefined,
        discountAmount: priceType === "custom" ? 0 : (it.discountAmount ?? 0),
      };
      updated.total = recalcItemTotal(updated);
      return updated;
    }));
  }

  function onChangeField<T extends keyof LineItem>(key: string, field: T, value: LineItem[T]) {
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const updated: LineItem = { ...it, [field]: value } as LineItem;
      // Enforce rules based on price type
      if (updated.priceType === "fixed") {
        updated.units = undefined;
        updated.customPrice = undefined;
      } else if (updated.priceType === "per_unit" || updated.priceType === "per_hour") {
        updated.customPrice = undefined;
      } else if (updated.priceType === "custom") {
        updated.unitPrice = undefined;
        updated.units = undefined;
        updated.discountAmount = 0;
      }
      updated.total = recalcItemTotal(updated);
      return updated;
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !eventName || !startAt || !endAt || items.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone: customerPhone || undefined,
        eventName,
        startAt,
        endAt,
        items: items
          .filter((x) => x.serviceId)
          .map((x) => ({
            serviceId: x.serviceId!,
            variantName: x.variantName || undefined,
            priceType: x.priceType,
            unitPrice: x.priceType !== "custom" ? x.unitPrice : undefined,
            units: x.priceType === "per_unit" ? x.units : undefined,
            customPrice: x.priceType === "custom" ? x.customPrice : undefined,
            discountAmount: x.priceType === "custom" ? 0 : (x.discountAmount ?? 0),
          })),
        discountAmount: bookingDiscount || 0,
      };
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setCustomerName("");
        setCustomerPhone("");
        setEventName("");
        setStartAt("");
        setEndAt("");
        setStartDate("");
        setStartTime("");
        setEndDate("");
        setEndTime("");
        setItems([]);
        setBookingDiscount(0);
        alert(t("bookingCreated"));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || t("failedToCreate"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const allServices = [...services, ...overlapServices];
  const hasLineDiscount = items.some((x) => (x.discountAmount ?? 0) > 0);
  const canDownloadQuotation = useMemo(() => {
    const hasService = items.some((x) => !!x.serviceId);
    return Boolean(customerName && eventName && startAt && endAt && hasService);
  }, [customerName, eventName, startAt, endAt, items]);

  async function handleDownloadQuotation() {
    try {
      await generateQuotationPDF({
        customerName,
        customerPhone,
        eventName,
        startAt,
        endAt,
        items: items.map((x) => ({
          serviceName: x.serviceName,
          variantName: x.variantName,
          priceType: x.priceType,
          units: x.units,
          unitPrice: x.unitPrice,
          total: x.total,
        })),
        subtotal,
        totalLineDiscount,
        bookingDiscount,
        total,
        company,
      });
    } catch (e) {
      alert(t("failedToCreate"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("bookingDetails")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t("nameOfPerson")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t("phoneNumber")} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t("eventName")} value={eventName} onChange={(e) => setEventName(e.target.value)} />
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("startDateLabel")}</label>
              <SearchableSelect
                options={startDateOptionObjs}
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  if (endDate && !endDateOptions.includes(endDate)) setEndDate("");
                }}
                placeholder={t("selectDate")}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("startTime")}</label>
              <SearchableSelect
                options={timeOptions}
                value={startTime}
                onChange={setStartTime}
                placeholder={t("selectTime")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("endDateLabel")}</label>
              <SearchableSelect
                options={endDateOptionObjs}
                value={endDate}
                onChange={setEndDate}
                placeholder={startDate ? t("selectDate") : t("selectStartDateFirst")}
                disabled={!startDate}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("endTime")}</label>
              <SearchableSelect
                options={timeOptions}
                value={endTime}
                onChange={setEndTime}
                placeholder={startDate ? t("selectTime") : t("selectStartDateTimeFirst")}
                disabled={!startDate}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t("services")}</h3>
          <span className="text-xs text-gray-500">{t("selectServiceVariantAuto")}</span>
        </div>
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="min-w-[980px] w-full text-sm divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[180px]">{t("service")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[160px]">{t("variant")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[120px]">{t("pricing")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[100px]">{t("units")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[140px]">{t("unitFixed")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[140px]">{t("custom")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[150px]">{t("lineDiscount")}</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider min-w-[110px]">{t("total")}</th>
                <th className="px-3 py-2 w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((it) => {
                const svc = allServices.find((s) => s._id === it.serviceId);
                const variants = svc?.variants ?? [];
                return (
                  <tr key={it.key} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <SearchableSelect
                        options={allServices.map((s) => ({ value: s._id, label: s.name }))}
                        value={it.serviceId || ""}
                        onChange={(v) => onSelectService(it.key, v)}
                        placeholder={!canQuery ? t("selectStartEndToLoad") : loadingServices ? t("loading") : t("selectService")}
                        disabled={!canQuery || loadingServices}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select className="border rounded-lg px-2 py-2 w-full truncate focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={it.variantName || ""} onChange={(e) => onChangeVariant(it.key, e.target.value)} disabled={!it.serviceId}>
                        <option value="">{variants.length ? t("selectVariant") : t("noVariants")}</option>
                        {variants.map((v) => (
                          <option key={v.name} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input className="border rounded-lg px-2 py-2 w-28 bg-gray-50 text-gray-700" value={formatPriceTypeDisplay(it.priceType)} readOnly />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" className="border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={it.units ?? 0} onChange={(e) => onChangeField(it.key, "units", Number(e.target.value))} disabled={!(["per_hour", "per_unit"].includes(it.priceType))} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">₹</span>
                        <input type="number" className="border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={it.unitPrice ?? 0} onChange={(e) => onChangeField(it.key, "unitPrice", Number(e.target.value))} disabled />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">₹</span>
                        <input type="number" className="border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={it.customPrice ?? 0} onChange={(e) => onChangeField(it.key, "customPrice", Number(e.target.value))} disabled={it.priceType !== "custom"} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">₹</span>
                        <input type="number" className="border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={it.discountAmount ?? 0} onChange={(e) => onChangeField(it.key, "discountAmount", Number(e.target.value))} disabled={it.priceType === "custom"} />
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium">₹{it.total.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="text-red-600 hover:underline" onClick={() => removeRow(it.key)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={9}>{t("noServicesAdded")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center pt-2">
          <button type="button" onClick={addRow} className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-2 rounded-lg shadow-sm hover:from-purple-700 hover:to-purple-800 transition-colors">{t("addService")}</button>
        </div>
      </div>

      <div className="flex items-end justify-end">
        <div className="w-full sm:w-[420px]">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-gray-600">{t("subtotal")}</span>
                <span className="text-gray-900 font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-gray-600">{t("discountAmount")}</span>
                {hasLineDiscount ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">₹</span>
                    <input type="number" className="border rounded-lg px-2 py-1 w-28 disabled:bg-gray-50 disabled:text-gray-400 disabled:pointer-events-none" value={totalLineDiscount} disabled />
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">₹</span>
                    <input type="number" className="border rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" value={bookingDiscount} onChange={(e) => setBookingDiscount(Number(e.target.value))} />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-gray-900 font-medium">{t("total")}</span>
                <span className="text-gray-900 font-semibold">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-3">
            <button type="button" onClick={handleDownloadQuotation} disabled={!canDownloadQuotation} className={`w-full sm:w-auto border px-4 py-2.5 rounded-lg min-w-40 ${canDownloadQuotation ? 'border-purple-600 text-purple-700 hover:bg-purple-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}>
              {t("downloadQuotation")}
            </button>
            <button disabled={submitting} className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-2.5 rounded-lg min-w-40 shadow-sm hover:from-purple-700 hover:to-purple-800 transition-colors">
              {submitting ? t("saving") : t("saveBooking")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}


