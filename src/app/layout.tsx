import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Hotel Management",
  description: "Hotel Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as "en" | "hi";
  
  // Load messages directly based on locale
  const messages = await import(`../../messages/${locale}.json`).then(m => m.default).catch(() => 
    import(`../../messages/en.json`).then(m => m.default)
  );

  return (
    <html lang={locale} dir="ltr">
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
