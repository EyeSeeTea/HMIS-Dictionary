import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";
import { readXlsx } from "../support/xlsx";

const NAME = t("object_name");

test.describe("HIS: Search export", () => {
    test("The file keeps the sort order of the table", async ({ search }) => {
        await search.load();
        await search.searchFor("malaria");
        await expect(search.table.rows.first()).toBeVisible();
        await search.table.sortBy(NAME);
        await search.table.sortBy(NAME);
        const onScreen = await search.table.columnValues(NAME);

        const file = await search.download(() => search.exportButton.click());
        const sheets = await readXlsx(file.path);
        const exported = sheets["Search Data"]!.rows.slice(0, onScreen.length).map(row =>
            (row[NAME] ?? "").trim()
        );

        expect(exported).toEqual(onScreen);
    });

    test("The button is disabled when there are no rows", async ({ search }) => {
        await search.load();
        await expect(search.exportButton).toBeEnabled();
        await search.searchFor("nosuchworde2e");
        await expect(search.table.rows).toHaveCount(0);
        await expect(search.exportButton).toBeDisabled();
    });
});
