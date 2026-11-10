import { defaultMetadataIds } from "$/domain/entities/MetadataIds";
import { fireEvent, RenderResult, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { Future } from "$/domain/entities/generic/Future";
import { AppSettingsAttrs } from "$/domain/entities/AppSettings";
import { getReactComponent } from "$/utils/tests";
import { AdminPage } from "$/webapp/pages/admin/AdminPage";
import { parseIds, stringifyIds } from "$/webapp/pages/admin/adminSettings";

/** The Angular ids are part of the e2e contract, so they are checked by id. */
function byId(view: RenderResult, id: string): HTMLElement {
    // eslint-disable-next-line testing-library/no-node-access
    const element = view.container.querySelector<HTMLElement>(`#${id}`);
    if (!element) throw new Error(`No element with id ${id}`);
    return element;
}

const success = <T,>(value: T) => Future.success<Error, T>(value);

describe("parseIds", () => {
    it("reads a JSON array of strings, and an empty field as no ids", () => {
        expect(parseIds('["a","b"]')).toEqual({ type: "valid", ids: ["a", "b"] });
        expect(parseIds("")).toEqual({ type: "valid", ids: [] });
        expect(parseIds("  ")).toEqual({ type: "valid", ids: [] });
    });

    it("rejects everything else", () => {
        expect(parseIds("a,b").type).toBe("invalid");
        expect(parseIds('{"a":1}').type).toBe("invalid");
        expect(parseIds("[1]").type).toBe("invalid");
    });

    it("writes ids in the same format", () => {
        expect(stringifyIds(["a", "b"])).toBe('["a","b"]');
    });
});

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

    it("saves a list of ids on its own and reloads the app", async () => {
        const { view, update, reload } = setup();
        const field = view.getAllByLabelText("DS_UIDs")[0] as HTMLElement;

        fireEvent.change(field, { target: { value: '["ds1","ds2"]' } });
        fireEvent.click(byId(view, "submitDS"));

        await waitFor(() => expect(reload).toHaveBeenCalled());
        const [changes] = update.mock.calls[0] ?? [];
        expect(changes?.blacklist?.dataSetIds).toEqual(["ds1", "ds2"]);
        expect(changes?.blacklist?.tag).toBe("Blacklisted");
    });

    it("shows the format error and does not write", async () => {
        const { view, update } = setup();
        const field = view.getAllByLabelText("DS_UIDs")[1] as HTMLElement;

        fireEvent.change(field, { target: { value: "not an array" } });
        fireEvent.click(byId(view, "submitLEG_OPG"));

        expect(await view.findByText("Invalid array format")).toBeInTheDocument();
        expect(update).not.toHaveBeenCalled();
    });
});
