"use client";

import { useTranslations } from "next-intl";
import ServiceForm from "../ServiceForm";

export default function ServicesAddClient({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("pages.services");
  const tCommon = useTranslations("common");

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Managers cannot add services. Please contact an admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("addTitle")}</h2>
        <p className="text-gray-500">{t("description")}</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-8 shadow-sm">
        <ServiceForm />
      </div>
    </div>
  );
}

