import { defaultMetadataIds } from "$/domain/entities/MetadataIds";
import { fireEvent, RenderResult, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { Future } from "$/domain/entities/generic/Future";
import { AppSettingsAttrs } from "$/domain/entities/AppSettings";
import { getReactComponent } from "$/utils/tests";
import { AdminPage } from "$/webapp/pages/admin/AdminPage";

/** The Angular ids are part of the e2e contract, so they are checked by id. */
function byId(view: RenderResult, id: string): HTMLElement {
    // eslint-disable-next-line testing-library/no-node-access
    const element = view.container.querySelector<HTMLElement>(`#${id}`);
    if (!element) throw new Error(`No element with id ${id}`);
    return element;
}

const success = <T,>(value: T) => Future.success<Error, T>(value);

describe("AdminPage", () => {
    function setup(options: { codesOk?: boolean } = {}) {
        const update = vi.fn((_changes: Partial<AppSettingsAttrs>) => success(undefined));
        const compositionRoot = getTestCompositionRoot({
            userGroupRepository: {
                getAll: () =>
                    success([
                        { id: "g1", name: "Zeta" },
                        { id: "g2", name: "Alpha" },
                    ]),
                exists: () => success(true),
            },
            healthServiceRepository: {
                getGroupSets: () => success([{ id: "gs1", name: "Services" }]),
                getHealthServices: () =>
                    success(
                        options.codesOk === false
                            ? []
                            : [{ id: "h", code: "A_B_C", name: "H" } as never]
                    ),
            },
            attributeRepository: {
                getAll: () =>
                    success([
                        {
                            id: defaultMetadataIds.healthServiceAttribute,
                            name: "serviceCode",
                            dataSetAttribute: true,
                            indicatorGroupAttribute: true,
                            dataElementAttribute: false,
                            programAttribute: false,
                        },
                    ]),
            },
            metadataListRepository: {
                getAll: model =>
                    success(
                        model === "dataSets"
                            ? [
                                  { id: "ds1", name: "Data set 1" },
                                  { id: "ds2", name: "Data set 2" },
                              ]
                            : []
                    ),
            },
            appSettingsRepository: {
                get: () => success(createSettings()),
                update,
            },
        });
        const reload = vi.fn();
        Object.defineProperty(window, "location", {
            value: { ...window.location, reload },
            writable: true,
        });
        const view = getReactComponent(<AdminPage />, {
            compositionRoot,
            settings: createSettings(),
        });
        return { view, update, reload };
    }

    it("shows each check as success or error", async () => {
        const { view } = setup({ codesOk: false });

        await waitFor(() => expect(byId(view, "divOUG")).toHaveAttribute("data-status", "error"));
        expect(byId(view, "divUG")).toHaveAttribute("data-status", "ok");
        expect(byId(view, "divA")).toHaveAttribute("data-status", "ok");
    });

    it("saves a list of ids, chosen by name, on its own and reloads the app", async () => {
        const { view, update, reload } = setup();
        const select = await view.findByTestId("ids-submitDS");
        await waitFor(() => expect(select).not.toHaveTextContent("Loading"));

        fireEvent.click(within(select).getByTestId(/input$/));
        fireEvent.click(await view.findByText("Data set 2"));
        fireEvent.click(view.getByText("Data set 1"));
        expect(within(select).getByText("blacklistedDs (not found)")).toBeInTheDocument();
        fireEvent.click(byId(view, "submitDS"));

        await waitFor(() => expect(reload).toHaveBeenCalled());
        const [changes] = update.mock.calls[0] ?? [];
        expect(changes?.blacklist?.dataSetIds).toEqual(["blacklistedDs", "ds2", "ds1"]);
        expect(changes?.blacklist?.tag).toBe("Blacklisted");
    });

    it("clears a selected setting with None", async () => {
        const { view, update, reload } = setup();
        const select = byId(view, "drpBoxAllUsersUG");
        await waitFor(() => expect(select).toHaveDisplayValue(/not found/));

        fireEvent.change(select, { target: { value: "" } });
        fireEvent.click(byId(view, "submitAllUsersUG"));

        await waitFor(() => expect(reload).toHaveBeenCalled());
        const [changes] = update.mock.calls[0] ?? [];
        expect(changes?.metadataIds?.allUsersGroup).toBeUndefined();
        expect(changes?.metadataIds?.icd10Attribute).toBe(defaultMetadataIds.icd10Attribute);
    });
});
