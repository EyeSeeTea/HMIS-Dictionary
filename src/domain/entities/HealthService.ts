import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type HealthServiceAttrs = { id: Id; code: string; name: string };

/** A line of care: an organisation unit group in the configured group set. */
export class HealthService extends Struct<HealthServiceAttrs>() {
    key(): string {
        return this.code.split("_")[2] ?? "";
    }

    matchesAttributeValue(value: string): boolean {
        const key = this.key();
        if (!key) return false;

        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`_${escapedKey}(_|$)`).test(value);
    }

    static keysFromAttributeValue(value: string): string[] {
        return value.split("_").slice(1);
    }
}
