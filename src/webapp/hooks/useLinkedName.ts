import React from "react";
import { Maybe } from "$/utils/ts-utils";

/** Keys of the names passed from the Indicators screen to the Data Sets and Programs screens. */
export const linkedNameKeys = { dataSet: "dataSetName", program: "programName" } as const;

/**
 * The name another screen asked to look for, kept in the session as the Angular app did. It is
 * read once, when the screen opens, and forgotten afterwards.
 */
export function useLinkedName(key: string): Maybe<string> {
    const [name] = React.useState<Maybe<string>>(() => {
        const value = sessionStorage.getItem(key) ?? undefined;
        sessionStorage.removeItem(key);
        return value;
    });

    return name;
}
