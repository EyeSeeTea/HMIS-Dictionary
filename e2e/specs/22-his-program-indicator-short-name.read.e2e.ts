import { expect, test } from "../support/fixtures";
import { t } from "../support/i18n";

test.describe("HIS: short name of program indicators", () => {
    test("The Short Name column shows it", async ({ search, api }) => {
        const [programIndicator] = await api.list("programIndicators", {
            fields: "id,displayShortName",
            filter: "shortName:!null",
            pageSize: 1,
            paging: true,
        });
        await search.load();
        await search.filterById(programIndicator.id);
        await expect(search.table.rows).toHaveCount(1);
        await expect(await search.table.cell(0, t("object_shortName"))).toHaveText(
            programIndicator.displayShortName
        );
    });
});
