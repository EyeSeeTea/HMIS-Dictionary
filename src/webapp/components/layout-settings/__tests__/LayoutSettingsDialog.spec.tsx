import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { Future } from "$/domain/entities/generic/Future";
import { LayoutSettings } from "$/domain/entities/LayoutSettings";
import { getReactComponent } from "$/utils/tests";
import { LayoutSettingsDialog } from "$/webapp/components/layout-settings/LayoutSettingsDialog";

const settings = LayoutSettings.defaults("search");

function setup(options: { existingGroups?: string[] } = {}) {
    const save = vi.fn(() => Future.success<Error, void>(undefined));
    const compositionRoot = getTestCompositionRoot({
        layoutSettingsRepository: { get: () => Future.success(undefined), save },
        userGroupRepository: {
            getAll: () =>
                Future.success((options.existingGroups ?? []).map(id => ({ id, name: id }))),
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

const groupsField = (view: ReturnType<typeof setup>["view"]) =>
    view.getByRole("textbox") as HTMLInputElement;

describe("LayoutSettingsDialog", () => {
    it("lists sections and their columns with the stored groups", () => {
        const { view } = setup();

        expect(groupsField(view).value).toBe('["LjRqO9XzQPs"]');
        expect(view.getByText("Data Elements or Indicators - Basics")).toBeInTheDocument();
        expect(view.getAllByText("Name").length).toBeGreaterThan(0);
    });

    it("disables Restore until something changes, then undoes it", () => {
        const { view } = setup();
        const restore = view.getByRole("button", { name: "Restore changes" });
        expect(restore).toBeDisabled();

        fireEvent.change(groupsField(view), { target: { value: "[]" } });
        expect(restore).toBeEnabled();

        fireEvent.click(restore);
        expect(groupsField(view).value).toBe('["LjRqO9XzQPs"]');
        expect(restore).toBeDisabled();
    });

    it("reloads without saving when nothing changed", () => {
        const { view, save, onApplied } = setup();

        fireEvent.click(view.getByRole("button", { name: "Apply changes" }));

        expect(onApplied).toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
    });

    it("shows the format error and does not save", () => {
        const { view, save } = setup();

        fireEvent.change(groupsField(view), { target: { value: "not json" } });
        fireEvent.click(view.getByRole("button", { name: "Apply changes" }));

        expect(view.getByText("Invalid array format")).toBeInTheDocument();
        expect(save).not.toHaveBeenCalled();
    });

    it("shows the group error for unknown groups and clears it when editing", async () => {
        const { view, save } = setup({ existingGroups: ["known"] });

        fireEvent.change(groupsField(view), { target: { value: '["unknown"]' } });
        fireEvent.click(view.getByRole("button", { name: "Apply changes" }));

        expect(await view.findByText("All UID's must be a valid userGroup")).toBeInTheDocument();
        expect(save).not.toHaveBeenCalled();

        fireEvent.change(groupsField(view), { target: { value: '["known"]' } });
        expect(view.queryByText("All UID's must be a valid userGroup")).not.toBeInTheDocument();
    });

    it("saves valid changes and reloads", async () => {
        const { view, save, onApplied } = setup({ existingGroups: ["known"] });

        fireEvent.change(groupsField(view), { target: { value: '["known"]' } });
        fireEvent.click(view.getByRole("button", { name: "Apply changes" }));

        await waitFor(() => expect(onApplied).toHaveBeenCalled());
        expect(save).toHaveBeenCalledOnce();
    });
});
