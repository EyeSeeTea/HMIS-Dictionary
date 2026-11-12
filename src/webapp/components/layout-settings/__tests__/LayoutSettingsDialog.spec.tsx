import { fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { Future } from "$/domain/entities/generic/Future";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { getReactComponent } from "$/utils/tests";
import { LayoutSettingsDialog } from "$/webapp/components/layout-settings/LayoutSettingsDialog";

const settings = LayoutSettings.defaults("search", "LjRqO9XzQPs");

function setup(options: { existingGroups?: string[] } = {}) {
    const save = vi.fn(() => Future.success<Error, void>(undefined));
    const compositionRoot = getTestCompositionRoot({
        layoutSettingsRepository: { get: () => Future.success(undefined), save },
        userGroupRepository: {
            getAll: () =>
                Future.success(
                    (options.existingGroups ?? []).map(id => ({ id, name: `Group ${id}` }))
                ),
            exists: () => Future.success(true),
        },
    });
    const onApplied = vi.fn();
    const view = getReactComponent(
        <LayoutSettingsDialog settings={settings} onClose={() => {}} onApplied={onApplied} />,
        { compositionRoot }
    );

    return { view, save, onApplied };
}

type View = ReturnType<typeof setup>["view"];

/** The chips of the selected groups, by name. */
async function selectedGroups(view: View): Promise<string[]> {
    const select = await view.findByTestId("advanced-user-groups");
    await waitFor(() => expect(select).not.toHaveTextContent("Loading"));
    return within(select)
        .queryAllByTestId(/chip$/)
        .map(chip => chip.textContent ?? "");
}

async function pickGroup(view: View, name: string) {
    fireEvent.click(within(await view.findByTestId("advanced-user-groups")).getByTestId(/input$/));
    fireEvent.click(await view.findByText(name));
}

function removeGroup(view: View, name: string) {
    const chip = within(view.getByTestId("advanced-user-groups")).getByText(name);
    // eslint-disable-next-line testing-library/no-node-access
    const remove = chip.closest("[data-test$='chip']")?.querySelector("[data-test$='remove']");
    if (!remove) throw new Error(`No remove button for ${name}`);
    fireEvent.click(remove);
}

const apply = (view: View) => fireEvent.click(view.getByRole("button", { name: "Apply changes" }));

describe("LayoutSettingsDialog", () => {
    it("lists sections and their columns with the stored groups, by name", async () => {
        const { view } = setup({ existingGroups: ["LjRqO9XzQPs"] });

        expect(await selectedGroups(view)).toEqual(["Group LjRqO9XzQPs"]);
        expect(view.getByText("Data Elements or Indicators - Basics")).toBeInTheDocument();
        expect(view.getAllByText("Name").length).toBeGreaterThan(0);
    });

    it("shows a stored group missing on the instance by its id", async () => {
        const { view } = setup();

        expect(await selectedGroups(view)).toEqual(["LjRqO9XzQPs (not found)"]);
    });

    it("disables Restore until something changes, then undoes it", async () => {
        const { view } = setup({ existingGroups: ["LjRqO9XzQPs"] });
        const restore = view.getByRole("button", { name: "Restore changes" });
        await selectedGroups(view);
        expect(restore).toBeDisabled();

        removeGroup(view, "Group LjRqO9XzQPs");
        expect(restore).toBeEnabled();
        expect(await selectedGroups(view)).toEqual([]);

        fireEvent.click(restore);
        expect(await selectedGroups(view)).toEqual(["Group LjRqO9XzQPs"]);
        expect(restore).toBeDisabled();
    });

    it("reloads without saving when nothing changed", () => {
        const { view, save, onApplied } = setup();

        apply(view);

        expect(onApplied).toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
    });

    it("shows the group error for unknown groups and clears it when editing", async () => {
        const { view, save } = setup({ existingGroups: ["known"] });

        await pickGroup(view, "Group known");
        apply(view);

        expect(await view.findByText("All UID's must be a valid userGroup")).toBeInTheDocument();
        expect(save).not.toHaveBeenCalled();

        removeGroup(view, "LjRqO9XzQPs (not found)");
        expect(view.queryByText("All UID's must be a valid userGroup")).not.toBeInTheDocument();
    });

    it("saves valid changes and reloads", async () => {
        const { view, save, onApplied } = setup({ existingGroups: ["LjRqO9XzQPs", "known"] });

        await pickGroup(view, "Group known");
        apply(view);

        await waitFor(() => expect(onApplied).toHaveBeenCalled());
        expect(save).toHaveBeenCalledOnce();
    });
});
