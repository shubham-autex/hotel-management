"use client";

import jsPDF from "jspdf";

export type QuotationItem = {
  serviceName?: string;
  variantName?: string;
  priceType: "per_unit" | "fixed" | "custom" | "per_hour";
  units?: number;
  unitPrice?: number;
  total: number;
};

export async function generateQuotationPDF(params: {
  customerName: string;
  customerPhone?: string;
  eventName: string;
  startAt: string;
  endAt: string;
  items: QuotationItem[];
  subtotal: number;
  totalLineDiscount: number;
  bookingDiscount: number;
  total: number;
  company?: {
    name?: string;
    address?: string;
    contactPersonName?: string;
    contactPhone?: string;
    logo?: string;
    gstin?: string;
  };
}) {
  const { customerName, customerPhone, eventName, startAt, endAt, items, subtotal, totalLineDiscount, bookingDiscount, total, company } = params;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  let y = 0;

  // Enhanced color palette
  const colors = {
    primary: { r: 109, g: 40, b: 217 },    // Purple
    primaryLight: { r: 139, g: 92, b: 246 }, // Light purple
    secondary: { r: 59, g: 130, b: 246 },   // Blue
    accent: { r: 16, g: 185, b: 129 },      // Green
    dark: { r: 31, g: 41, b: 55 },         // Dark gray
    gray: { r: 107, g: 114, b: 128 },      // Medium gray
    lightGray: { r: 156, g: 163, b: 175 },  // Light gray
    background: { r: 248, g: 250, b: 252 }, // Very light blue
    white: { r: 255, g: 255, b: 255 }
  };

  // Helper functions
  const setColor = (color: typeof colors.primary) => {
    doc.setTextColor(color.r, color.g, color.b);
  };

  const setFillColor = (color: typeof colors.primary) => {
    doc.setFillColor(color.r, color.g, color.b);
  };

  // Start from top margin (no header)
  y = margin;

  // Enhanced company information card
  const hotelCardHeight = 80;
  // No shadow for transparent design
  setFillColor(colors.white);
  doc.roundedRect(margin, y, pageWidth - margin * 2, hotelCardHeight, 0, 0, "F");
  
  // Accent border
  setFillColor(colors.primary);
  doc.roundedRect(margin, y, 6, hotelCardHeight, 0, 0, "F");

  // Logo area with enhanced styling
  const logoX = margin + 20;
  const logoY = y + 15;
  const logoSize = 50;
  
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    if (company?.logo && company.logo.startsWith("data:image")) {
      img.src = company.logo;
    } else if (company?.logo) {
      img.src = company.logo;
    } else {
      img.src = "/logo-s.jpg";
    }
    await new Promise((res, rej) => { 
      img.onload = res; 
      img.onerror = rej; 
    });
    
    // Logo shadow with light gray
    // doc.setFillColor(230, 230, 230);
    // doc.circle(logoX + logoSize/2 + 2, logoY + logoSize/2 + 2, logoSize/2 + 2, "F");
    
    // Logo border
    // setFillColor(colors.background);
    // doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 3, "F");
    
    doc.addImage(img, "JPEG", logoX, logoY, logoSize, logoSize);
  } catch (error) {
    // Fallback logo design
    setFillColor(colors.primary);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, "F");
    setColor(colors.white);
    doc.setFontSize(20);
    try { (doc as any).setFont(undefined, "bold"); } catch {}
    doc.text("SH", logoX + logoSize/2 - 12, logoY + logoSize/2 + 7);
  }

  // Company information
  const infoX = logoX + logoSize + 25;
  let infoY = y + 25;
  
  setColor(colors.dark);
  doc.setFontSize(24);
  try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text(company?.name || "Saubhagya Hotel", infoX, infoY);
  
  infoY += 20;
  setColor(colors.gray);
  doc.setFontSize(12);
  try { (doc as any).setFont(undefined, "normal"); } catch {}
  if (company?.gstin) {
    doc.text(`GSTIN: ${company.gstin}`, infoX, infoY);
  }
  
  doc.setFontSize(10);
  const contactInfo = [
    `Address: ${company?.address || "Janta Marg, Khalilabad, Uttar Pradesh - 272175"}`,
    `Proprietor: ${company?.contactPersonName || "Shyam Murari Lal Srivastava"}`,
    `Phone: ${company?.contactPhone || "+91 94505 73042"}`
  ];
  
  contactInfo.forEach(info => {
    doc.text(info, infoX, infoY);
    infoY += 12;
  });

  y += hotelCardHeight + 30;

  

  // Combined customer and event details section
  const customerSectionHeight = 20;
  setFillColor(colors.background);
  doc.roundedRect(margin, y - 5, pageWidth - margin * 2, customerSectionHeight, 0, 0, "F");
  
  setColor(colors.dark);
  doc.setFontSize(14);
  try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Customer & Event Details", margin + 15, y + 10);
  
  y += customerSectionHeight + 5;

  // Event dates preparation
  const startStr = startAt ? new Date(startAt).toLocaleDateString('en-IN', { 
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }) : "—";
  const endStr = endAt ? new Date(endAt).toLocaleDateString('en-IN', { 
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }) : "—";

  // Combined customer info and event details
  const combinedCardHeight = 80;
  // No shadow for transparent design
  setFillColor(colors.white);
  doc.roundedRect(margin, y, pageWidth - margin * 2, combinedCardHeight, 0, 0, "F");

  const colWidth = (pageWidth - margin * 2 - 40) / 3;
  const allDetails = [
    { label: "Customer Name", value: customerName || "—" },
    { label: "Event Name", value: eventName || "—" },
    { label: "Phone Number", value: customerPhone || "—" },
    { label: "Event Start", value: startStr },
    { label: "Event End", value: endStr }
  ];

  // First row - Customer details
  allDetails.slice(0, 3).forEach((detail, idx) => {
    const x = margin + 20 + idx * colWidth;
    setColor(colors.gray);
    doc.setFontSize(10);
    try { (doc as any).setFont(undefined, "bold"); } catch {}
    doc.text(detail.label.toUpperCase(), x, y + 20);
    
    setColor(colors.dark);
    doc.setFontSize(12);
    try { (doc as any).setFont(undefined, "normal"); } catch {}
    doc.text(detail.value, x, y + 35);
  });

  // Second row - Event dates
  allDetails.slice(3, 5).forEach((detail, idx) => {
    const x = margin + 20 + idx * (colWidth * 1.5);
    setColor(colors.gray);
    doc.setFontSize(10);
    try { (doc as any).setFont(undefined, "bold"); } catch {}
    doc.text(detail.label.toUpperCase(), x, y + 50);
    
    setColor(colors.dark);
    doc.setFontSize(11);
    try { (doc as any).setFont(undefined, "normal"); } catch {}
    doc.text(detail.value, x, y + 65);
  });

  y += combinedCardHeight + 30;

  // Items section header with transparency
  const itemsSectionHeight = 20;
  setFillColor(colors.background);
  doc.roundedRect(margin, y - 5, pageWidth - margin * 2, itemsSectionHeight, 0, 0, "F");
  
  setColor(colors.dark);
  doc.setFontSize(14);
  try { (doc as any).setFont(undefined, "bold"); } catch {}
  const itemsTitle = "Service Items";
  doc.text(itemsTitle, margin + 15, y + 10);

  y += itemsSectionHeight + 5;

  // Enhanced table with proper sizing to prevent overflow
  const tableHeaders = ["Service", "Variant", "Pricing", "Units", "Rate", "Amount"];
  const availableWidth = pageWidth - margin * 2 - 30;
  const colWidths = [availableWidth * 0.25, availableWidth * 0.2, availableWidth * 0.15, availableWidth * 0.1, availableWidth * 0.15, availableWidth * 0.15];
  const colPositions = [margin + 15];
  for (let i = 1; i < colWidths.length; i++) {
    colPositions.push(colPositions[i-1] + colWidths[i-1]);
  }

  // Table header
  const tableHeaderHeight = 20;
  setFillColor(colors.dark);
  doc.roundedRect(margin, y, pageWidth - margin * 2, tableHeaderHeight, 0, 0, "F");
  
  setColor(colors.white);
  doc.setFontSize(11);
  try { (doc as any).setFont(undefined, "bold"); } catch {}
  
  tableHeaders.forEach((header, idx) => {
    doc.text(header, colPositions[idx], y + 15);
  });

  y += tableHeaderHeight;

  // Table rows with alternating colors
  const rowHeight = 20;
  items.forEach((item, idx) => {
    if (y > pageHeight - 150) {
      doc.addPage();
      y = margin;
    }

    // Row background
    if (idx % 2 === 0) {
      setFillColor(colors.background);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }

    const rowData = [
      item.serviceName || "—",
      item.variantName || "—",
      (item.priceType || "").replace(/_/g, " ").toUpperCase(),
      item.priceType === "per_unit" || item.priceType === "per_hour" ? String(item.units ?? 0) : "—",
      item.priceType !== "custom" ? `${(item.unitPrice ?? 0).toLocaleString('en-IN')}` : "Custom",
      `${(item.total ?? 0).toLocaleString('en-IN')}`
    ];

    setColor(colors.dark);
    doc.setFontSize(10);
    try { (doc as any).setFont(undefined, "normal"); } catch {}

    rowData.forEach((data, colIdx) => {
      // Ensure text fits within column width
      const maxWidth = colWidths[colIdx] - 10;
      let displayText = data;
      
      // Truncate text if too long
      while (doc.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
        displayText = displayText.substring(0, displayText.length - 1);
      }
      if (displayText !== data && displayText.length > 3) {
        displayText = displayText.substring(0, displayText.length - 3) + '...';
      }

      doc.text(displayText, colPositions[colIdx], y + 12);
      
      // if (colIdx === rowData.length - 1) {
      //   // Right align amount
      //   try { (doc as any).setFont(undefined, "bold"); } catch {}
      //   const textWidth = doc.getTextWidth(displayText);
      //   doc.text(displayText, colPositions[colIdx] + colWidths[colIdx] - textWidth - 10, y + 22);
      // } else {
      //   doc.text(displayText, colPositions[colIdx], y + 22);
      // }
    });

    // Row separator
    if (idx < items.length - 1) {
      doc.setDrawColor(colors.lightGray.r, colors.lightGray.g, colors.lightGray.b);
      doc.setLineWidth(0.5);
      doc.line(margin + 10, y + rowHeight, pageWidth - margin - 10, y + rowHeight);
    }

    y += rowHeight;
  });

  y += 10;

  // Enhanced totals card with transparency
  const totalsCardWidth = 280;
  const totalsCardHeight = 120;
  const totalsCardX = pageWidth - margin - totalsCardWidth;
  
  
  // Totals header
  setFillColor(colors.secondary);
  doc.roundedRect(totalsCardX, y, totalsCardWidth, 22, 0, 0, "F");
  
  setColor(colors.white);
  doc.setFontSize(12);
  try { (doc as any).setFont(undefined, "bold"); } catch {}
  doc.text("Summary", totalsCardX + 20, y + 14);

  let totalsY = y + 35;
  const totalsData = [
    { label: "Subtotal", value: `${subtotal.toLocaleString('en-IN')}`, bold: false },
    { label: "Discount", value: `${(totalLineDiscount || bookingDiscount).toLocaleString('en-IN')}`, bold: false },
    { label: "Total Amount", value: `${total.toLocaleString('en-IN')}`, bold: true }
  ];

  totalsData.forEach((item, idx) => {
    setColor(idx === totalsData.length - 1 ? colors.primary : colors.gray);
    doc.setFontSize(idx === totalsData.length - 1 ? 14 : 11);
    if (item.bold) {
      try { (doc as any).setFont(undefined, "bold"); } catch {}
    } else {
      try { (doc as any).setFont(undefined, "normal"); } catch {}
    }
    
    doc.text(item.label, totalsCardX + 20, totalsY);
    const valueWidth = doc.getTextWidth(item.value);
    doc.text(item.value, totalsCardX + totalsCardWidth - 20 - valueWidth, totalsY);
    
    if (idx === totalsData.length - 2) {
      doc.setDrawColor(colors.lightGray.r, colors.lightGray.g, colors.lightGray.b);
      doc.line(totalsCardX + 20, totalsY + 5, totalsCardX + totalsCardWidth - 20, totalsY + 5);
    }
    
    totalsY += idx === totalsData.length - 1 ? 20 : 18;
  });

  // Footer
  const footerY = pageHeight - 60;
  setFillColor(colors.background);
  doc.rect(0, footerY, pageWidth, 60, "F");
  
  setColor(colors.gray);
  doc.setFontSize(9);
  try { (doc as any).setFont(undefined, "normal"); } catch {}
  doc.text("Thank you for choosing " + (company?.name || "Saubhagya Hotel & Banquets"), margin, footerY + 20);
  doc.text("This is a computer-generated quotation and does not require a signature.", margin, footerY + 32);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, margin, footerY + 44);
  
  // Footer decoration
  setFillColor(colors.primary);
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

  const filename = `Quotation_${customerName?.replace(/\s+/g, '_') || 'Guest'}_${Date.now()}.pdf`;
  doc.save(filename);
}