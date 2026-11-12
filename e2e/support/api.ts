import { APIRequestContext, APIResponse, request } from "@playwright/test";
import { env } from "./env";

const NS = "dataStore/HMIS_Dictionary";

export type Params = Record<string, string | number | boolean | string[]>;

/** Reads and writes DHIS2 directly, so expected values do not depend on the app under test. */
export class Api {
    private constructor(private context: APIRequestContext) {}

    static async create(): Promise<Api> {
        const context = await request.newContext({
            baseURL: env.dhis2Url,
            httpCredentials: { username: env.username, password: env.password, send: "always" },
        });
        return new Api(context);
    }

    dispose() {
        return this.context.dispose();
    }

    private url(path: string, params: Params = {}) {
        const query = Object.entries(params)
            .flatMap(([k, v]) => (Array.isArray(v) ? v.map(x => [k, x]) : [[k, String(v)]]))
            .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
            .join("&");
        return `/api/${path}${query ? `?${query}` : ""}`;
    }

    private async check(response: APIResponse, what: string) {
        if (!response.ok()) {
            throw new Error(
                `${what}: ${response.status()} ${(await response.text()).slice(0, 800)}`
            );
        }
        return response;
    }

    async get<T = any>(path: string, params: Params = {}): Promise<T> {
        const res = await this.context.get(this.url(path, params));
        await this.check(res, `GET ${path}`);
        return res.json();
    }

    /** Fetches a whole collection, for example api.list("indicators", { fields: "id,name" }). */
    async list<T = any>(resource: string, params: Params = {}): Promise<T[]> {
        const data = await this.get(resource, { paging: false, ...params });
        return data[resource];
    }

    async post(path: string, data: unknown, params: Params = {}) {
        const res = await this.context.post(this.url(path, params), { data: data as object });
        await this.check(res, `POST ${path}`);
        return res.json().catch(() => undefined);
    }

    /** Whether DHIS2 itself accepts the expression: it rejects some instance data, as `sum(I{x})` on 2.40. */
    async isValidExpression(expression: string, kind = "indicators"): Promise<boolean> {
        if (!expression.trim()) return true;
        const res = await this.context.post(this.url(`${kind}/expression/description`), {
            data: expression,
            headers: { "Content-Type": "text/plain" },
        });
        if (!res.ok()) return false;
        return (await res.json()).status === "OK";
    }

    /** Both formulas of the indicator are valid for DHIS2. */
    async hasValidFormulas(indicator: { numerator: string; denominator: string }) {
        return (
            (await this.isValidExpression(indicator.numerator)) &&
            (await this.isValidExpression(indicator.denominator))
        );
    }

    async put(path: string, data: unknown) {
        const res = await this.context.put(this.url(path), { data: data as object });
        await this.check(res, `PUT ${path}`);
    }

    async delete(path: string) {
        await this.context.delete(this.url(path));
    }

    async patch(path: string, operations: unknown[]) {
        const res = await this.context.patch(this.url(path), {
            data: JSON.stringify(operations),
            headers: { "Content-Type": "application/json-patch+json" },
        });
        return this.check(res, `PATCH ${path}`);
    }

    // DataStore

    async getKey<T = any>(key: string): Promise<T | undefined> {
        const res = await this.context.get(this.url(`${NS}/${key}`));
        if (res.status() === 404) return undefined;
        await this.check(res, `GET key ${key}`);
        return res.json();
    }

    /** Sets a key to a value, or removes it when the value is undefined. */
    async setKey(key: string, value: unknown) {
        const path = this.url(`${NS}/${key}`);
        if (value === undefined) {
            const res = await this.context.delete(path);
            if (res.status() !== 404) await this.check(res, `DELETE key ${key}`);
            return;
        }
        const exists = (await this.context.get(path)).ok();
        const options = {
            data: JSON.stringify(value),
            headers: { "Content-Type": "application/json" },
        };
        const res = exists
            ? await this.context.put(path, options)
            : await this.context.post(path, options);
        await this.check(res, `SET key ${key}`);
    }

    /** Runs fn and restores the keys to their previous value afterwards. */
    async withKeys<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
        const saved = await Promise.all(keys.map(k => this.getKey(k)));
        try {
            return await fn();
        } finally {
            for (const [i, key] of keys.entries()) await this.setKey(key, saved[i]);
        }
    }

    // User settings

    async getUserSetting(key: string): Promise<string> {
        const res = await this.context.get(this.url(`userSettings/${key}`), {
            headers: { Accept: "text/plain" },
        });
        return res.ok() ? (await res.text()).replace(/^"|"$/g, "") : "";
    }

    async setUserSetting(key: string, value: string | undefined) {
        const res =
            value === undefined
                ? await this.context.delete(this.url(`userSettings/${key}`))
                : await this.context.post(this.url(`userSettings/${key}`, { value }));
        await this.check(res, `Set user setting ${key}`);
    }

    async withLocale<T>(locale: string | undefined, fn: () => Promise<T>, db?: string): Promise<T> {
        const ui = await this.getUserSetting("keyUiLocale");
        const dbSaved = await this.getUserSetting("keyDbLocale");
        try {
            await this.setUserSetting("keyUiLocale", locale);
            if (db) await this.setUserSetting("keyDbLocale", db);
            return await fn();
        } finally {
            await this.setUserSetting("keyUiLocale", ui || "en");
            if (db) await this.setUserSetting("keyDbLocale", dbSaved || undefined);
        }
    }

    // Temporary metadata

    uid(): string {
        const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const chars = letters + "0123456789";
        const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
        return pick(letters) + Array.from({ length: 10 }, () => pick(chars)).join("");
    }

    private async metadata(payload: object, importStrategy: string) {
        const res = await this.post("metadata", payload, {
            importStrategy,
            atomicMode: "ALL",
        }).catch((e: Error) => ({ error: e.message }));
        if (res?.error || (res?.status && res.status !== "OK" && res.status !== "WARNING")) {
            throw new Error(
                `Metadata ${importStrategy} failed: ${JSON.stringify(res).slice(0, 1500)}`
            );
        }
        return res;
    }

    /** Creates metadata, runs fn, and always deletes the metadata afterwards. */
    async withMetadata<T>(payload: Record<string, object[]>, fn: () => Promise<T>): Promise<T> {
        await this.metadata(payload, "CREATE_AND_UPDATE");
        try {
            return await fn();
        } finally {
            await this.deleteMetadata(payload);
        }
    }

    /** Deletes one object at a time, with dependent objects first. Missing objects are fine. */
    private async deleteMetadata(payload: Record<string, object[]>) {
        const order = [
            "sections",
            "programRules",
            "programRuleActions",
            "programIndicators",
            "indicators",
            "dataSets",
            "dataElements",
            "optionGroups",
            "programNotificationTemplates",
            "organisationUnitGroupSets",
            "organisationUnitGroups",
        ];
        for (const type of order) {
            for (const { id } of (payload[type] ?? []) as { id: string }[]) {
                const path = this.url(`${type}/${id}`);
                let res = await this.context.delete(path);
                if (res.status() === 409 && type === "optionGroups") await this.emptyGroup(id);
                if (!res.ok() && res.status() !== 404) res = await this.context.delete(path);
                if (!res.ok() && res.status() !== 404) {
                    console.error(`Could not delete ${type}/${id}: ${res.status()}`);
                }
            }
        }
    }

    /** 2.40 answers 409 when deleting an option group that has options. */
    private async emptyGroup(id: string) {
        const group = await this.get(`optionGroups/${id}`, { fields: ":owner" });
        await this.put(`optionGroups/${id}`, { ...group, options: [] });
    }

    /** Sets a program's attribute values, runs fn, and restores them afterwards. */
    async withProgramAttributes<T>(programId: string, values: object[], fn: () => Promise<T>) {
        const { attributeValues } = await this.get(`programs/${programId}`, {
            fields: "attributeValues[value,attribute[id]]",
        });
        const set = (value: object[]) =>
            this.patch(`programs/${programId}`, [
                { op: "replace", path: "/attributeValues", value },
            ]);
        await set(values);
        try {
            return await fn();
        } finally {
            await set(attributeValues);
        }
    }

    /** Deletes visualizations by exact name. */
    async deleteVisualizations(name: string) {
        const found = await this.list("visualizations", {
            fields: "id",
            filter: `name:eq:${name}`,
        });
        for (const { id } of found) await this.context.delete(this.url(`visualizations/${id}`));
    }
}
