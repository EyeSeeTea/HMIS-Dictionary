import { describe, expect, it } from "vitest";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { Future } from "$/domain/entities/generic/Future";
import { getReactComponent } from "$/utils/tests";
import { useLayoutPermissions } from "$/webapp/hooks/useLayoutPermissions";

const Probe: React.FC<{ column: string }> = ({ column }) => {
    const access = useLayoutPermissions("search");
    return (
        <>
            <span>{access.loader?.type ?? "idle"}</span>
            <span>{access.canSeeColumn("objectsBasics", column) ? "visible" : "hidden"}</span>
        </>
    );
};

function render(options: { admin: boolean; column: string }) {
    return getReactComponent(<Probe column={options.column} />, {
        compositionRoot: getTestCompositionRoot({
            layoutSettingsRepository: {
                get: () => Future.success(undefined),
                save: () => Future.success(undefined),
            },
        }),
        currentUser: createUser({
            userGroups: options.admin ? [{ id: "adminGroupId", name: "Admins" }] : [],
        }),
        settings: createSettings(),
    });
}

describe("useLayoutPermissions", () => {
    it("hides admin columns from normal users, once loaded", async () => {
        const view = render({ admin: false, column: "id" });

        expect(view.getByText("hidden")).toBeInTheDocument();
        expect(await view.findByText("success")).toBeInTheDocument();
        expect(view.getByText("hidden")).toBeInTheDocument();
    });

    it("shows admin columns to admins", async () => {
        const view = render({ admin: true, column: "id" });

        expect(await view.findByText("visible")).toBeInTheDocument();
    });

    it("shows everyone columns to normal users", async () => {
        const view = render({ admin: false, column: "name" });

        expect(await view.findByText("visible")).toBeInTheDocument();
    });
});
