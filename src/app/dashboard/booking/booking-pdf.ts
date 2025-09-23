"use client";

import jsPDF from "jspdf";

type PriceType = "per_unit" | "fixed" | "custom" | "per_hour";

export type BookingPDFItem = {
  serviceName?: string;
  variantName?: string;
  priceType: PriceType;
  units?: number;
  unitPrice?: number;
  total: number;
};

export type BookingPDFPayment = {
  type: "received" | "refund";
  amount: number;
  mode: "cash" | "online";
  createdAt: string | Date;
};

export async function generateBookingPDF(params: {
  customerName: string;
  customerPhone?: string;
  eventName: string;
  startAt: string;
  endAt: string;
  items: BookingPDFItem[];
  payments: BookingPDFPayment[];
  subtotal: number;
  discountAmount: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  company?: {
    name?: string;
    address?: string;
    contactPersonName?: string;
    contactPhone?: string;
    logo?: string;
    gstin?: string;
  };
}) {
  const { customerName, customerPhone, eventName, startAt, endAt, items, payments, subtotal, discountAmount, total, company, status } = params;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  let y = margin;

  const colors = {
    primary: { r: 109, g: 40, b: 217 },
    dark: { r: 31, g: 41, b: 55 },
    gray: { r: 107, g: 114, b: 128 },
    background: { r: 248, g: 250, b: 252 },
    white: { r: 255, g: 255, b: 255 },
  };
  const setColor = (c: typeof colors.primary) => doc.setTextColor(c.r, c.g, c.b);
  const setFill = (c: typeof colors.primary) => doc.setFillColor(c.r, c.g, c.b);

  // Company header
  const headerH = 80;
  setFill(colors.white);
  doc.roundedRect(margin, y, pageWidth - margin * 2, headerH, 0, 0, "F");
  setFill(colors.primary);
  doc.rect(margin, y, 6, headerH, "F");

  const logoX = margin + 20;
  const logoY = y + 15;
  const logoSize = 50;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    if (company?.logo && company.logo.startsWith("data:image")) img.src = company.logo; else if (company?.logo) img.src = company.logo; else img.src = "/logo-s.jpg";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    doc.addImage(img, "JPEG", logoX, logoY, logoSize, logoSize);
  } catch {}

  const infoX = logoX + logoSize + 25;
  let infoY = y + 25;
  setColor(colors.dark); doc.setFontSize(20); try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text(company?.name || "Saubhagya Hotel", infoX, infoY);
  infoY += 18; setColor(colors.gray); doc.setFontSize(11); try { (doc as any).setFont(undefined, "normal"); } catch {}
  if (company?.gstin) {
    doc.text(`GSTIN: ${company.gstin}`, infoX, infoY);
    infoY += 14; doc.setFontSize(10);
  }
  const lines = [
    `Address: ${company?.address || "Janta Marg, Khalilabad, Uttar Pradesh - 272175"}`,
    `Proprietor: ${company?.contactPersonName || "Shyam Murari Lal Srivastava"}`,
    `Phone: ${company?.contactPhone || "+91 94505 73042"}`,
  ];
  lines.forEach(l => { doc.text(l, infoX, infoY); infoY += 12; });

  y += headerH + 20; 

  // Customer block
  setFill(colors.background);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 20, "F");
  setColor(colors.dark); doc.setFontSize(13); try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Customer & Event Details", margin + 15, y + 9);
  y += 25;

  const startStr = new Date(startAt).toLocaleString();
  const endStr = new Date(endAt).toLocaleString();
  doc.setFontSize(10); setColor(colors.gray);
  const fields = [
    ["Customer", customerName || "—"],
    ["Phone", customerPhone || "—"],
    ["Event", eventName || "—"],
    ["Status", status || "—"],
    ["Start", startStr],
    ["End", endStr],
  ];
  const half = (pageWidth - margin * 2 - 30) / 2;
  fields.forEach((f, i) => {
    const x = margin + 15 + (i % 2) * half;
    const yy = y + Math.floor(i / 2) * 16;
    try { (doc as any).setFont(undefined, "bold"); } catch {}
    doc.text(`${f[0]}:`, x, yy);
    try { (doc as any).setFont(undefined, "normal"); } catch {}
    setColor(colors.dark);
    doc.text(String(f[1]), x + 60, yy);
  });
  y += 80;

  // Services table
  setFill(colors.background); doc.rect(margin, y - 5, pageWidth - margin * 2, 20, "F");
  setColor(colors.dark); doc.setFontSize(13); try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Services", margin + 15, y + 9);
  y += 25;

  const headers1 = ["Service", "Variant", "Pricing", "Units", "Rate", "Amount"];
  const availW1 = pageWidth - margin * 2 - 30;
  const colW1 = [availW1 * 0.25, availW1 * 0.2, availW1 * 0.15, availW1 * 0.1, availW1 * 0.15, availW1 * 0.15];
  const colX1 = [margin + 15]; for (let i = 1; i < colW1.length; i++) colX1.push(colX1[i-1] + colW1[i-1]);
  setFill(colors.dark); doc.rect(margin, y, pageWidth - margin * 2, 20, "F"); setColor(colors.white); doc.setFontSize(10); try { (doc as any).setFont(undefined, "bold"); } catch {}
  headers1.forEach((h, i) => doc.text(h, colX1[i], y + 14));
  y += 20; doc.setFontSize(10); setColor(colors.dark); try { (doc as any).setFont(undefined, "normal"); } catch {}
  const rowH = 20;
  items.forEach((it, idx) => {
    if (y > pageHeight - 160) { doc.addPage(); y = margin; }
    if (idx % 2 === 0) { setFill(colors.background); doc.rect(margin, y, pageWidth - margin * 2, rowH, "F"); }
    const row = [
      it.serviceName || "—",
      it.variantName || "—",
      (it.priceType || "").replace(/_/g, " ").toUpperCase(),
      (it.priceType === "per_unit" || it.priceType === "per_hour") ? String(it.units ?? 0) : "—",
      (it.priceType !== "custom" ? `${(it.unitPrice ?? 0).toLocaleString('en-IN')}` : "Custom"),
      `${(it.total ?? 0).toLocaleString('en-IN')}`,
    ];
    row.forEach((txt, i) => doc.text(String(txt), colX1[i], y + 13));
    y += rowH;
  });

  y += 40;

  // Payments table
  setFill(colors.background); doc.rect(margin, y - 5, pageWidth - margin * 2, 20, "F");
  setColor(colors.dark); doc.setFontSize(13); try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Payments", margin + 15, y + 9);
  y += 25;

  const headers2 = ["Type", "Amount", "Mode", "Date"];
  const availW2 = pageWidth - margin * 2 - 30;
  const colW2 = [availW2 * 0.2, availW2 * 0.2, availW2 * 0.2, availW2 * 0.4];
  const colX2 = [margin + 15]; for (let i = 1; i < colW2.length; i++) colX2.push(colX2[i-1] + colW2[i-1]);
  setFill(colors.dark); doc.rect(margin, y, pageWidth - margin * 2, 20, "F"); setColor(colors.white); doc.setFontSize(10); try { (doc as any).setFont(undefined, "bold"); } catch {}
  headers2.forEach((h, i) => doc.text(h, colX2[i], y + 14));
  y += 20; doc.setFontSize(10); setColor(colors.dark); try { (doc as any).setFont(undefined, "normal"); } catch {}
  payments.forEach((p, idx) => {
    if (y > pageHeight - 120) { doc.addPage(); y = margin; }
    if (idx % 2 === 0) { setFill(colors.background); doc.rect(margin, y, pageWidth - margin * 2, rowH, "F"); }
    const row = [p.type, `${Number(p.amount || 0).toLocaleString('en-IN')}`, p.mode, new Date(p.createdAt).toLocaleString()];
    row.forEach((txt, i) => doc.text(String(txt), colX2[i], y + 13));
    y += rowH;
  });

  y += 40;
  // Summary
  const received = payments.filter(p => p.type === "received").reduce((s, p) => s + Number(p.amount || 0), 0);
  const refunded = payments.filter(p => p.type === "refund").reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid = Math.max(0, received - refunded);
  const remaining = Math.max(0, total - paid);

  const boxW = 280; const boxX = pageWidth - margin - boxW; const boxH = 120;
  setFill(colors.white); doc.rect(boxX, y, boxW, boxH, "F");
  setFill(colors.primary); doc.rect(boxX, y, boxW, 22, "F"); setColor(colors.white); doc.setFontSize(12); try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Summary", boxX + 20, y + 14);
  setColor(colors.gray); doc.setFontSize(11); try { (doc as any).setFont(undefined, "normal"); } catch {}
  const rows = [
    ["Subtotal", subtotal],
    ["Discount", discountAmount],
    ["Total", total],
    ["Paid", paid],
    ["Remaining", remaining],
  ];
  let yy = y + 36; setColor(colors.dark);
  rows.forEach(([label, value], i) => {
    doc.text(String(label), boxX + 20, yy);
    const val = `${Number(value as number).toLocaleString('en-IN')}`;
    const w = doc.getTextWidth(val);
    doc.text(val, boxX + boxW - 20 - w, yy);
    yy += 18;
  });

  // Footer
  const footerY = pageHeight - 60;
  setFill(colors.background);
  doc.rect(0, footerY, pageWidth, 60, "F");
  
  setColor(colors.gray);
  doc.setFontSize(9);
  try { (doc as any).setFont(undefined, "normal"); } catch {}
  doc.text("Thank you for choosing " + (company?.name || "Saubhagya Hotel & Banquets"), margin, footerY + 20);
  doc.text("This is a computer-generated booking and does not require a signature.", margin, footerY + 32);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, margin, footerY + 44);
  
  // Footer decoration
  setFill(colors.primary);
  doc.rect(0, footerY - 2, pageWidth, 2, "F");

  // Large faded watermark covering the page
  try {
    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.src = "/logo-s.jpg";
    await new Promise((res, rej) => { wm.onload = res; wm.onerror = rej; });
    
    // Large watermark covering most of the page
    const wmSize = Math.min(pageWidth, pageHeight);
    const wmX = (pageWidth - wmSize) / 2;
    const wmY = (pageHeight - wmSize) / 2;
    
    // Save current graphics state
    doc.saveGraphicsState();
    
    // Set very low opacity (10%)
    doc.setGState(new (doc as any).GState({opacity: 0.05}));
    doc.addImage(wm, "JPEG", wmX, wmY, wmSize, wmSize);
    
    // Restore graphics state
    doc.restoreGraphicsState();
  } catch {}

  const filename = `Booking_${customerName?.replace(/\s+/g, '_') || 'Guest'}_${Date.now()}.pdf`;
  doc.save(filename);
}


