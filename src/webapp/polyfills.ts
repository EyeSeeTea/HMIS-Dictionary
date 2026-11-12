import { Buffer } from "buffer";

/**
 * `@eyeseetea/d2-api` (its fetch client, through `iconv-lite`) and `btoa` use the Node global
 * `Buffer`. Only that global is provided: the full Node polyfills brought in crypto packages
 * with known vulnerabilities (see SECURITY.md). Imported first in main.tsx, before anything uses it.
 */
const scope = globalThis as { Buffer?: typeof Buffer };
scope.Buffer ??= Buffer;
