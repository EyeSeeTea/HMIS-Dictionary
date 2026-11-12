import { describe, expect, it, beforeEach } from "vitest";
import { createSettings } from "$/domain/entities/__tests__/fixtures";
import { createUser } from "$/domain/entities/__tests__/userFixtures";
import { getReactComponent } from "$/utils/tests";
import { Router } from "$/webapp/pages/Router";

const admins = { id: "adminGroupId", name: "Admins" };

function renderAt(hash: string, options: { admin: boolean }) {
    window.location.hash = hash;
    return getReactComponent(<Router />, {
        currentUser: createUser({ userGroups: options.admin ? [admins] : [] }),
        settings: createSettings(),
    });
}

describe("Router", () => {
    beforeEach(() => {
        window.location.hash = "";
    });

    it("redirects the root and unknown routes to search", () => {
        renderAt("#/nowhere", { admin: true });

        expect(window.location.hash).toBe("#/search");
    });

    it("lets admins open the admin page", () => {
        renderAt("#/admin", { admin: true });

        expect(window.location.hash).toBe("#/admin");
    });

    it("sends users that cannot manage away from admin and the editor", () => {
        renderAt("#/admin", { admin: false });
        expect(window.location.hash).toBe("#/search");

        renderAt("#/dossiers/editor", { admin: false });
        expect(window.location.hash).toBe("#/search");
    });
});
