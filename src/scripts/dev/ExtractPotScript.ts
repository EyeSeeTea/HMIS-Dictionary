import fs from "fs";
import path from "path";
import ts from "typescript";
import { po, GetTextTranslations } from "gettext-parser";

const sourceDir = "src";
const potPath = path.join("i18n", "en.pot");
const extensions = [".js", ".jsx", ".ts", ".tsx"];
const functionNames = ["i18n.t", "i18next.t"];

/* Write i18n/en.pot with the texts of every i18n.t("...") call in src/.

   This replaces @dhis2/d2-i18n-extract, which brought in i18next-scanner and, through it,
   deepmerge (GHSA-gcqx-w48m-w2h4, no fixed release; see SECURITY.md). Same behaviour: only
   literal texts are extracted, in the order they are found, and the file is not rewritten
   when the texts have not changed, so its dates stay as they are.
*/
function main() {
    const texts = unique(listFiles(sourceDir).flatMap(getTexts));
    const current = fs.existsSync(potPath) ? getPotTexts(fs.readFileSync(potPath)) : [];

    if (sameList(texts, current)) {
        console.info(`No i18n changes: ${texts.length} texts in ${potPath}`);
        return;
    }

    fs.writeFileSync(potPath, po.compile(buildPot(texts), { sort: false }) + "\n");
    console.info(`Written: ${texts.length} texts to ${potPath}`);
}

function listFiles(dir: string): string[] {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap(entry => {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return listFiles(entryPath);
            return entry.isFile() && extensions.includes(path.extname(entry.name))
                ? [entryPath]
                : [];
        });
}

function getTexts(filePath: string): string[] {
    const source = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true
    );
    const texts: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && functionNames.includes(node.expression.getText(source))) {
            const [first] = node.arguments;
            if (first && ts.isStringLiteralLike(first)) texts.push(first.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);

    return texts;
}

function getPotTexts(content: Buffer): string[] {
    return Object.keys(po.parse(content).translations[""] ?? {}).filter(Boolean);
}

function buildPot(texts: string[]): GetTextTranslations {
    const now = new Date().toISOString();
    const entries = Object.fromEntries(texts.map(text => [text, { msgid: text, msgstr: [""] }]));

    return {
        charset: "utf-8",
        headers: {
            "Project-Id-Version": "i18next-conv",
            "MIME-Version": "1.0",
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Transfer-Encoding": "8bit",
            "Plural-Forms": "nplurals=2; plural=(n != 1)",
            "POT-Creation-Date": now,
            "PO-Revision-Date": now,
        },
        translations: { "": { "": { msgid: "", msgstr: [""] }, ...entries } },
    };
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values));
}

function sameList(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}

main();
