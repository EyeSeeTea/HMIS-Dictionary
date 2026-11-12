import fs from "fs";
import path from "path";
import { po, GetTextTranslations } from "gettext-parser";

/* Fills the empty translations of i18n/<language>.po with the ones of the Angular app.

   Usage: yarn run-script src/scripts/dev/ImportAngularTranslationsScript.ts <languages dir>
   The directory has the Angular files (en.json, es.json...). The Angular keys are not used by the
   app: the English text is, so a translation is found by the English text of its key.

   Existing translations are never replaced. Run `yarn update-po` first, so en.pot is up to date. */

/* Texts the Angular app never translated, because they are new in the React app or were hard-coded
   in English. Only the short ones of the interface: the long help texts of Admin stay in English,
   as they were. Keys are the English texts. Order: es, fr, pt, ar. */
const extraTranslations: Record<string, [string, string, string, string]> = {
    "No data": ["Sin datos", "Aucune donnée", "Sem dados", "لا توجد بيانات"],
    "Select...": ["Seleccionar...", "Sélectionner...", "Selecionar...", "اختر..."],
    "No matches": [
        "Sin coincidencias",
        "Aucune correspondance",
        "Sem correspondências",
        "لا توجد نتائج مطابقة",
    ],
    Clear: ["Limpiar", "Effacer", "Limpar", "مسح"],
    "Advanced User": ["Usuario avanzado", "Utilisateur avancé", "Usuário avançado", "مستخدم متقدم"],
    "Normal User": ["Usuario normal", "Utilisateur normal", "Usuário normal", "مستخدم عادي"],
    Close: ["Cerrar", "Fermer", "Fechar", "إغلاق"],
    "Restore changes": [
        "Restaurar cambios",
        "Restaurer les modifications",
        "Restaurar alterações",
        "استعادة التغييرات",
    ],
    "Apply changes": [
        "Aplicar cambios",
        "Appliquer les modifications",
        "Aplicar alterações",
        "تطبيق التغييرات",
    ],
    "Invalid array format": [
        "Formato de lista no válido",
        "Format de liste invalide",
        "Formato de lista inválido",
        "تنسيق القائمة غير صالح",
    ],
    "All UID's must be a valid userGroup": [
        "Todos los UID deben ser grupos de usuarios válidos",
        "Tous les UID doivent être des groupes d'utilisateurs valides",
        "Todos os UID devem ser grupos de usuários válidos",
        "يجب أن تكون جميع المعرفات مجموعات مستخدمين صالحة",
    ],
    "The settings could not be saved": [
        "No se pudo guardar la configuración",
        "Les paramètres n'ont pas pu être enregistrés",
        "Não foi possível salvar as configurações",
        "تعذر حفظ الإعدادات",
    ],
    "The setting could not be saved": [
        "No se pudo guardar el ajuste",
        "Le paramètre n'a pas pu être enregistré",
        "Não foi possível salvar a configuração",
        "تعذر حفظ الإعداد",
    ],
    "Loading...": ["Cargando...", "Chargement...", "Carregando...", "جار التحميل..."],
    Print: ["Imprimir", "Imprimer", "Imprimir", "طباعة"],
    Submit: ["Enviar", "Envoyer", "Enviar", "إرسال"],
    "No data elements": [
        "Sin elementos de datos",
        "Aucun élément de données",
        "Sem elementos de dados",
        "لا توجد عناصر بيانات",
    ],
    "Select a Data Set": [
        "Seleccione un conjunto de datos",
        "Sélectionner un jeu de données",
        "Selecione um conjunto de dados",
        "اختر مجموعة بيانات",
    ],
    "Select an Indicator": [
        "Seleccione un indicador",
        "Sélectionner un indicateur",
        "Selecione um indicador",
        "اختر مؤشرا",
    ],
    "Select a program": [
        "Seleccione un programa",
        "Sélectionner un programme",
        "Selecione um programa",
        "اختر برنامجا",
    ],
    "Describing indicators": [
        "Describiendo indicadores",
        "Description des indicateurs",
        "Descrevendo indicadores",
        "جار وصف المؤشرات",
    ],
    "Describing expressions": [
        "Describiendo expresiones",
        "Description des expressions",
        "Descrevendo expressões",
        "جار وصف التعبيرات",
    ],
    "Back to reader": [
        "Volver al lector",
        "Retour à la lecture",
        "Voltar ao leitor",
        "العودة إلى القارئ",
    ],
    Save: ["Guardar", "Enregistrer", "Salvar", "حفظ"],
    Edit: ["Editar", "Modifier", "Editar", "تحرير"],
    "Show / Hide advanced columns": [
        "Mostrar / Ocultar columnas avanzadas",
        "Afficher / Masquer les colonnes avancées",
        "Mostrar / Ocultar colunas avançadas",
        "إظهار / إخفاء الأعمدة المتقدمة",
    ],
    "Loading search data": [
        "Cargando los datos de búsqueda",
        "Chargement des données de recherche",
        "Carregando os dados de pesquisa",
        "جار تحميل بيانات البحث",
    ],
    "No results": ["Sin resultados", "Aucun résultat", "Sem resultados", "لا توجد نتائج"],
    "Previous page": ["Página anterior", "Page précédente", "Página anterior", "الصفحة السابقة"],
    "Next page": ["Página siguiente", "Page suivante", "Próxima página", "الصفحة التالية"],
    "Total: {{total}}": [
        "Total: {{total}}",
        "Total : {{total}}",
        "Total: {{total}}",
        "الإجمالي: {{total}}",
    ],
    "Number of Data Sets: {{count}}": [
        "Número de conjuntos de datos: {{count}}",
        "Nombre de jeux de données : {{count}}",
        "Número de conjuntos de dados: {{count}}",
        "عدد مجموعات البيانات: {{count}}",
    ],
    "Number of Indicators: {{count}}": [
        "Número de indicadores: {{count}}",
        "Nombre d'indicateurs : {{count}}",
        "Número de indicadores: {{count}}",
        "عدد المؤشرات: {{count}}",
    ],
};

const languages = ["es", "fr", "pt", "ar"];
const i18nDir = "i18n";

function main() {
    const languagesDir = process.argv[2];
    if (!languagesDir) throw new Error("Usage: ImportAngularTranslationsScript <languages dir>");

    const pot = po.parse(fs.readFileSync(path.join(i18nDir, "en.pot")));
    const english = readJson(path.join(languagesDir, "en.json"));

    for (const language of languages) {
        const translated = readJson(path.join(languagesDir, `${language}.json`));
        const byEnglish = getTranslationsByEnglish(english, translated);
        const extraIndex = languages.indexOf(language);
        for (const [text, texts] of Object.entries(extraTranslations)) {
            const extra = texts[extraIndex];
            if (extra && !byEnglish.has(text)) byEnglish.set(text, extra);
        }
        const filePath = path.join(i18nDir, `${language}.po`);
        const file = fs.existsSync(filePath)
            ? po.parse(fs.readFileSync(filePath))
            : withLanguage(pot, language);

        let imported = 0;
        const entries = file.translations[""] ?? {};

        for (const [msgid, entry] of Object.entries(entries)) {
            if (!msgid || entry.msgstr.some(Boolean)) continue;
            const text = byEnglish.get(msgid) ?? byEnglish.get(msgid.trim());
            if (text) {
                entry.msgstr = [text];
                imported++;
            }
        }

        fs.writeFileSync(filePath, po.compile(file as GetTextTranslations, { sort: false }));
        console.info(`${filePath}: ${imported} imported`);
    }
}

/** An empty file for the language, with the entries of en.pot (a copy: the pot is reused). */
function withLanguage(pot: GetTextTranslations, language: string): GetTextTranslations {
    const copy: GetTextTranslations = JSON.parse(JSON.stringify(pot));
    copy.headers = { ...copy.headers, Language: language };
    return copy;
}

/** The "idx_" keys (the menu) win when the same English text has several translations. */
function getTranslationsByEnglish(
    english: Record<string, string>,
    translated: Record<string, string>
): Map<string, string> {
    const keys = Object.keys(english).sort(
        (a, b) => Number(b.startsWith("idx_")) - Number(a.startsWith("idx_"))
    );
    const result = new Map<string, string>();

    for (const key of keys) {
        const text = english[key];
        const translation = translated[key];
        if (!text || !translation || translation === text || result.has(text)) continue;
        result.set(text, translation);
        result.set(text.trim(), translation.trim());
    }

    return result;
}

function readJson(filePath: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

main();
