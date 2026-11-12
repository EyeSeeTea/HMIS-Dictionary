import { Indicator } from "$/domain/entities/Indicator";
import { SearchCatalog, SearchObject } from "$/domain/entities/SearchCatalog";
import { SearchRow } from "$/domain/entities/SearchFilter";

export type SearchTableRow = { id: string; object: SearchObject; row: SearchRow };

/** `rows()` follows the order of `objects`, one for one. */
export function getTableRows(catalog: SearchCatalog): SearchTableRow[] {
    const rows = catalog.rows();

    return catalog.objects.flatMap((object, index) => {
        const row = rows[index];
        return row ? [{ id: `${object.type}-${object.id}`, object, row }] : [];
    });
}

/**
 * The visualization only needs the id, the name and the formulas of the indicator. The rest are
 * not used, so they are empty.
 */
export function toIndicator(object: SearchObject): Indicator | undefined {
    if (object.type !== "indicator") return undefined;

    return Indicator.create({
        id: object.id,
        name: object.name,
        shortName: object.shortName,
        formName: object.formName,
        description: object.description,
        type: "",
        numerator: object.numerator,
        denominator: object.denominator,
        numeratorDescription: "",
        denominatorDescription: "",
        numeratorText: "",
        denominatorText: "",
        groupIds: [],
    });
}
