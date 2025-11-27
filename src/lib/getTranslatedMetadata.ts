import { cookies } from "next/headers";
import type { Metadata } from "next";

type MessagesDictionary = Record<string, unknown>;

export async function getTranslatedMetadata(
  titleKey: string,
  descriptionKey?: string
): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as "en" | "hi";

  const loadMessages = async (): Promise<MessagesDictionary> => {
    const fallback = () => import(`../../messages/en.json`).then((m) => m.default as MessagesDictionary);
    try {
      const localeModule = await import(`../../messages/${locale}.json`);
      return localeModule.default as MessagesDictionary;
    } catch {
      return fallback();
    }
  };

  const messages = await loadMessages();

  const title = getNestedValue(messages, titleKey) || "Hotel Management";
  const description = descriptionKey ? getNestedValue(messages, descriptionKey) : undefined;

  return {
    title,
    description,
  };
}

function getNestedValue(obj: MessagesDictionary, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>((current, key) => (typeof current === "object" && current !== null ? (current as MessagesDictionary)[key] : undefined), obj);

  return typeof value === "string" ? value : undefined;
}

