import * as path from "path";
import { expect, fixtures, test } from "../support/fixtures";

const dir = path.join(
    __dirname,
    "..",
    "test-results",
    "screens",
    process.env.E2E_SCREENS ?? "angular"
);

test.describe("0. Infrastructure", () => {
    test("Save a screenshot of each screen for manual comparison, without failing the run", async ({
        page,
        search,
        dossiers,
        programs,
        dataSets,
        indicators,
        admin,
        api,
    }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
        await search.load();
        await shot("search");
        await dossiers.loadRoute("dossiers");
        await dossiers.select(fixtures.service.name);
        await shot("dossiers");
        await dossiers.openEditor();
        await shot("dossiers-editor");
        await programs.load();
        await programs.select(fixtures.programs.ambulances.name);
        await shot("programs");
        await dataSets.load();
        await dataSets.select(fixtures.dataSets.small.name);
        await shot("data-sets");
        const { name } = await api.get(`indicators/${fixtures.nestedIndicator.id}`, {
            fields: "name",
        });
        await indicators.load();
        await indicators.select(name);
        await shot("indicators");
        await admin.load();
        await shot("admin");
        await expect(page).toHaveTitle("Metadata Dictionary");
    });
});
