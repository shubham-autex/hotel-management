import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function getTranslatedMetadata(
  titleKey: string,
  descriptionKey?: string
): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as "en" | "hi";
  
  const messages = await import(`../../messages/${locale}.json`).then(m => m.default).catch(() => 
    import(`../../messages/en.json`).then(m => m.default)
  );

  const title = getNestedValue(messages, titleKey) || "Hotel Management";
  const description = descriptionKey ? getNestedValue(messages, descriptionKey) : undefined;

  return {
    title,
    description,
  };
}

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

