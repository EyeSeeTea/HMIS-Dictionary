import { Locale } from "$/domain/entities/Shared";

export const supportedLocales: Locale[] = ["ar", "en", "es", "fr", "pt"];

/** "pt_BR" -> "pt", and any language the app has no translations for -> "en". */
export function toSupportedLocale(keyUiLocale: string | undefined): Locale {
    const language = (keyUiLocale ?? "").split(/[-_]/)[0]?.toLowerCase();
    return supportedLocales.find(locale => locale === language) ?? "en";
}
