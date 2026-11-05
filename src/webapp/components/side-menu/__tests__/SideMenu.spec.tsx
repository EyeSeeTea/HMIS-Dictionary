import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { getReactComponent } from "$/utils/tests";
import { SideMenu } from "$/webapp/components/side-menu/SideMenu";

const admins = { id: "adminGroupId", name: "Admins" };

function renderMenu(options: { admin: boolean; hasGroupSet: boolean; path?: string }) {
    return getReactComponent(
        <MemoryRouter initialEntries={[options.path ?? "/search"]}>
            <SideMenu />
        </MemoryRouter>,
        {
            currentUser: createUser({ userGroups: options.admin ? [admins] : [] }),
            settings: createSettings({
                healthServiceGroupSet: options.hasGroupSet
                    ? { id: "gs", name: "Services" }
                    : undefined,
            }),
        }
    );
}

describe("SideMenu", () => {
    it("shows every item, in order, to an admin when the group set is configured", () => {
        const view = renderMenu({ admin: true, hasGroupSet: true });

        const labels = view.getAllByRole("link").map(item => item.textContent);
        expect(labels).toEqual([
            "Search",
            "Dossiers",
            "Programs",
            "Data Sets",
            "Indicators",
            "Admin",
        ]);
    });

    it("hides Admin from users outside the admin group", () => {
        const view = renderMenu({ admin: false, hasGroupSet: true });

        expect(view.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("hides Dossiers when the health service group set is not configured", () => {
        const view = renderMenu({ admin: true, hasGroupSet: false });

        expect(view.queryByText("Dossiers")).not.toBeInTheDocument();
    });

    it("keeps Dossiers active in the editor", () => {
        const view = renderMenu({ admin: true, hasGroupSet: true, path: "/dossiers/editor" });

        // The active state is only a css class of the dhis2 menu item.
        // eslint-disable-next-line testing-library/no-container
        const active = Array.from(view.container.querySelectorAll("li.active"));
        expect(active.map(item => item.textContent)).toEqual(["Dossiers"]);
    });
});
