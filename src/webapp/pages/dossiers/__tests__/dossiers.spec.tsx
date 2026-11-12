import { MemoryRouter } from "react-router-dom";
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { Future } from "$/domain/entities/generic/Future";
import { HealthService } from "$/domain/entities/HealthService";
import { HealthServiceTranslations } from "$/domain/entities/HealthServiceTranslations";
import { getReactComponent } from "$/utils/tests";
import { toSupportedLocale } from "$/webapp/utils/locale";
import { DossierEditor } from "$/webapp/pages/dossiers/DossierEditor";
import { DossierReader } from "$/webapp/pages/dossiers/DossierReader";

// TinyMCE needs a real browser: a textarea stands in for it
vi.mock("$/webapp/components/rich-text-editor/RichTextEditor", () => ({
    RichTextEditor: (props: { initialValue: string; onChange: (html: string) => void }) => (
        <textarea
            aria-label="editor"
            defaultValue={props.initialValue}
            onChange={event => props.onChange(event.target.value)}
        />
    ),
}));

const service = HealthService.create({ id: "svc", code: "HS_X_AB", name: "Service AB" });
const success = <T,>(value: T) => Future.success<Error, T>(value);

describe("toSupportedLocale", () => {
    it("keeps the language and falls back to English", () => {
        expect(toSupportedLocale("es")).toBe("es");
        expect(toSupportedLocale("pt_BR")).toBe("pt");
        expect(toSupportedLocale("ar-EG")).toBe("ar");
        expect(toSupportedLocale("ru")).toBe("en");
        expect(toSupportedLocale(undefined)).toBe("en");
    });
});

describe("DossierReader", () => {
    const compositionRoot = getTestCompositionRoot({
        healthServiceTextRepository: {
            getText: () => success("<p>About the service</p>"),
            getTranslations: id =>
                success(
                    HealthServiceTranslations.create({ healthServiceId: id, translations: [] })
                ),
            saveTranslations: () => success(undefined),
        },
        dossierRepository: {
            getDataSets: () =>
                success([
                    {
                        id: "ds1",
                        name: "Zeta set",
                        attributeValues: [{ attributeId: "a", value: "_AB" }],
                    },
                ]),
            getIndicatorGroups: () =>
                success([
                    {
                        id: "ig1",
                        name: "Group 1",
                        attributeValues: [{ attributeId: "a", value: "_AB" }],
                    },
                ]),
            getSections: () =>
                success([
                    {
                        id: "sec1",
                        name: "Section 1",
                        dataElements: [
                            { id: "de1", name: "Element 1", formName: "", description: "Desc 1" },
                        ],
                    },
                    { id: "sec2", name: "Comments", dataElements: [] },
                ]),
            getIndicators: () =>
                success([
                    { id: "i2", name: "Beta", formName: "", description: "" },
                    { id: "i1", name: "Alpha", formName: "", description: "" },
                ]),
        },
    });

    const renderReader = (canEdit: boolean) =>
        getReactComponent(
            <MemoryRouter>
                <DossierReader
                    service={service}
                    canEdit={canEdit}
                    onCounts={() => {}}
                    onLoadingChange={() => {}}
                />
            </MemoryRouter>,
            { compositionRoot }
        );

    it("shows the description, the data sets and the indicator groups, without the Comments section", async () => {
        const view = renderReader(true);

        expect(await view.findByText("About the service")).toBeInTheDocument();
        expect((await view.findAllByText("Zeta set")).length).toBeGreaterThan(0);
        expect(await view.findByText("Element 1")).toBeInTheDocument();
        expect(view.queryByText("Section: Comments")).not.toBeInTheDocument();
        expect(view.getByText("Indicator Group: Group 1")).toBeInTheDocument();
    });

    it("sorts the indicators by name", async () => {
        const view = renderReader(true);

        await view.findByText("Alpha");
        const names = view.getAllByRole("cell").map(cell => cell.textContent);
        expect(names.indexOf("Alpha")).toBeLessThan(names.indexOf("Beta"));
    });

    it("shows the Edit button to who can manage", async () => {
        const view = renderReader(true);

        expect(await view.findByRole("button", { name: /Edit/ })).toBeInTheDocument();
    });

    it("hides the Edit button from the others", async () => {
        const view = renderReader(false);

        await view.findByText("About the service");
        expect(view.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    });
});

describe("DossierEditor", () => {
    function setup(save: () => ReturnType<typeof success<void>>) {
        const saveTranslations = vi.fn((_translations: HealthServiceTranslations) => save());
        const compositionRoot = getTestCompositionRoot({
            healthServiceTextRepository: {
                getText: () => success("<p>Original</p>"),
                getTranslations: id =>
                    success(
                        HealthServiceTranslations.create({ healthServiceId: id, translations: [] })
                    ),
                saveTranslations,
            },
        });
        const view = getReactComponent(
            <MemoryRouter>
                <DossierEditor service={service} />
            </MemoryRouter>,
            { compositionRoot }
        );
        return { view, saveTranslations };
    }

    it("starts clean, turns dirty on edit and saved after saving under the selected language", async () => {
        const { view, saveTranslations } = setup(() => success(undefined));
        const editor = await view.findByLabelText("editor");
        const save = view.getByRole("button", { name: "Save" });
        expect(save).toHaveAttribute("data-state", "idle");
        await waitFor(() => expect(save).toBeEnabled());

        fireEvent.change(editor, { target: { value: "<p>Changed</p>" } });
        expect(save).toHaveAttribute("data-state", "dirty");

        fireEvent.click(save);
        await waitFor(() => expect(save).toHaveAttribute("data-state", "saved"));
        const [saved] = saveTranslations.mock.calls[0] ?? [];
        expect(saved?.translations).toEqual([
            { property: "DESCRIPTION", locale: "en", value: "<p>Changed</p>" },
        ]);
    });

    it("does not show the saved state when saving fails", async () => {
        const { view } = setup(() => Future.error(new Error("fail")));
        const editor = await view.findByLabelText("editor");

        const save = view.getByRole("button", { name: "Save" });
        await waitFor(() => expect(save).toBeEnabled());
        fireEvent.change(editor, { target: { value: "x" } });
        fireEvent.click(save);

        await waitFor(() => expect(save).toHaveAttribute("data-state", "error"));
    });
});
