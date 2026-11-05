import { Struct } from "./generic/Struct";
import { Id } from "./Ref";
import { Locale } from "./Shared";

/** The locale is a plain string: translations in other languages are kept on save. */
export type Translation = { property: string; locale: string; value: string };

export type HealthServiceTranslationsAttrs = {
    healthServiceId: Id;
    translations: Translation[];
};

export class HealthServiceTranslations extends Struct<HealthServiceTranslationsAttrs>() {
    withDescription(locale: Locale, html: string): HealthServiceTranslations {
        const others = this.translations.filter(
            translation => translation.locale !== locale || translation.property !== "DESCRIPTION"
        );
        const description = html ? [{ property: "DESCRIPTION", locale, value: html }] : [];

        return this._update({ translations: [...description, ...others] });
    }
}
