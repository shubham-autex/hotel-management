"use client";

import { useTranslations } from "next-intl";

export default function BookingEditClient({ textKey, descriptionKey }: { textKey: string; descriptionKey?: string }) {
  const t = useTranslations("pages.bookings");
  
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900">{t(textKey)}</h2>
      {descriptionKey && <p className="text-gray-500">{t(descriptionKey)}</p>}
    </>
  );
}

