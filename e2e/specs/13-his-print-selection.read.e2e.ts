import { config } from "../support/data";
import { expect, fixtures, test } from "../support/fixtures";
import { PrintSelectionPanel } from "../support/his";
import { t } from "../support/i18n";

const { small } = fixtures.dataSets;
const { eventProgram } = fixtures.programs;

test.describe("HIS: print selection", () => {
    test("Data Sets: an unchecked column stays on screen but is not printed", async ({
        dataSets,
        page,
    }) => {
        await dataSets.load();
        await dataSets.select(small.name);
        await dataSets.waitIdle();
        const panel = new PrintSelectionPanel(dataSets);
        await panel.open();
        const shortName = t("dos_ShortNameElement");
        const column = page.locator("#sectionContainer th", { hasText: shortName }).first();
        const name = page
            .locator("#sectionContainer th", { hasText: t("dos_NameElement") })
            .first();

        await panel.uncheck(shortName, "Data Elements Columns");
        await expect(column).toBeVisible();

        await page.emulateMedia({ media: "print" });
        await expect(column).toBeHidden();
        await expect(name).toBeVisible();
    });

    test("Data Sets: an unchecked section stays on screen but is not printed", async ({
        dataSets,
        api,
        page,
    }) => {
        const { sections } = await api.get(`dataSets/${small.id}`, {
            fields: "sections[id,displayName]",
        });
        await dataSets.load();
        await dataSets.select(small.name);
        await dataSets.waitIdle();
        const panel = new PrintSelectionPanel(dataSets);
        await panel.open();
        const [first] = sections;
        const heading = page.locator(`[id="${first.id}"]`);
        const combos = dataSets.categoryCombosHeading;

        await panel.uncheck(first.displayName);
        await expect(heading).toBeVisible();

        await page.emulateMedia({ media: "print" });
        await expect(heading).toBeHidden();
        await expect(combos).toBeVisible();
    });

    test("Data Sets: nothing can be printed with every section unchecked", async ({ dataSets }) => {
        await dataSets.load();
        await dataSets.select(small.name);
        await dataSets.waitIdle();
        await expect(dataSets.printButton).toBeEnabled();
        const panel = new PrintSelectionPanel(dataSets);
        await panel.open();

        const options = panel.panel.locator("fieldset").first().getByRole("checkbox");
        const total = await options.count();
        for (let index = 0; index < total; index++) {
            await options.nth(index).uncheck({ force: true });
        }

        await expect(dataSets.root.locator(".printButton").first()).toBeDisabled();
    });

    test("Data Sets: the selection goes back to everything with another data set", async ({
        dataSets,
        api,
    }) => {
        const { blacklistDS } = await config(api);
        const others = await api.list("dataSets", { fields: "id,displayName" });
        const other = others.find((d: any) => d.id !== small.id && !blacklistDS.includes(d.id));

        await dataSets.load();
        await dataSets.select(small.name);
        await dataSets.waitIdle();
        const panel = new PrintSelectionPanel(dataSets);
        await panel.open();
        const label = t("dos_ShortNameElement");
        await panel.uncheck(label, "Data Elements Columns");

        await dataSets.select(other.displayName);
        await dataSets.waitIdle();
        await panel.open();
        await expect(panel.option(label, "Data Elements Columns")).toBeChecked();
    });

    test("Programs: sections are grouped by stage, and rules can be left out", async ({
        programs,
        api,
        page,
    }) => {
        const { programStages } = await api.get(`programs/${eventProgram.id}`, {
            fields: "programStages[displayName,programStageSections[id,displayName]]",
        });
        await programs.load();
        await programs.select(eventProgram.name);
        await programs.waitIdle();
        const panel = new PrintSelectionPanel(programs);
        await panel.open();

        for (const stage of programStages) {
            await expect(
                panel.panel.locator("legend", { hasText: stage.displayName })
            ).toBeVisible();
        }

        const stage = programStages.find((s: any) => s.programStageSections.length > 0);
        const [section] = stage.programStageSections;
        const heading = page.locator(`[id="${section.id}"]`);
        await panel.uncheck(section.displayName);
        await panel.uncheck(t("dos_ProgramRules"));

        await expect(heading).toBeVisible();
        await expect(programs.rulesHeading).toBeVisible();
        await page.emulateMedia({ media: "print" });
        await expect(heading).toBeHidden();
        await expect(programs.rulesHeading).toBeHidden();
        await expect(
            programs.programIndicatorsHeading.or(programs.indicatorsHeading).first()
        ).toBeVisible();
    });

    test("Programs: an unchecked column stays on screen but is not printed", async ({
        programs,
        page,
    }) => {
        await programs.load();
        await programs.select(eventProgram.name);
        await programs.waitIdle();
        const panel = new PrintSelectionPanel(programs);
        await panel.open();
        const label = t("dos_ValueType");
        const column = page.locator("#stageContainer th", { hasText: label }).first();

        await panel.uncheck(label, "Data Elements Columns");
        await expect(column).toBeVisible();
        await page.emulateMedia({ media: "print" });
        await expect(column).toBeHidden();
    });
});
