import ar from "../fixtures/languages/ar.json";
import en from "../fixtures/languages/en.json";
import es from "../fixtures/languages/es.json";
import fr from "../fixtures/languages/fr.json";
import pt from "../fixtures/languages/pt.json";

export const languages = { en, es, fr, pt, ar } as Record<string, Record<string, string>>;

/** The label for a key in a language, falling back to English and then to the key itself. */
export function t(key: string, language = "en"): string {
    return languages[language]?.[key] ?? languages.en[key] ?? key;
}
