// jest-dom v6 registers its matchers through this entry point. The older
// `import matchers from "@testing-library/jest-dom/matchers"` + expect.extend
// form relies on a CJS deep path that the Vite 7 resolver no longer honours.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// The @dhis2/ui components and this app use `data-test`, as DHIS2 apps do
configure({ testIdAttribute: "data-test" });

afterEach(() => {
    cleanup();
});
