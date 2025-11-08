"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const [locale, setLocale] = useState<"en" | "hi">("en");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] as "en" | "hi" | undefined;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hi")) {
      setLocale(savedLocale);
    }
  }, []);

  const changeLanguage = (newLocale: "en" | "hi") => {
    setLocale(newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`; // 1 year
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title={t("language")}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <button
              onClick={() => changeLanguage("en")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg ${
                locale === "en" ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"
              }`}
            >
              English
            </button>
            <button
              onClick={() => changeLanguage("hi")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 last:rounded-b-lg ${
                locale === "hi" ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"
              }`}
            >
              हिंदी
            </button>
          </div>
        </>
      )}
    </div>
  );
}

