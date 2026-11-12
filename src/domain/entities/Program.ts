import { Maybe } from "$/utils/ts-utils";
import { OptionSet } from "./OptionSet";
import { VisibilityRule } from "./ProgramRule";
import { Id, NamedRef } from "./Ref";
import { AttributeValue } from "./Shared";

export type Program = NamedRef & {
    description: string;
    stageIds: Id[];
    /** The resources are in the attribute chosen in Admin, see getResourceIds. */
    attributeValues: AttributeValue[];
    /** Whether the user can read its data, which its event charts and reports need. */
    canReadData: boolean;
};

export type ProgramAttribute = NamedRef & {
    shortName: string;
    formName: string;
    description: string;
    valueType: string;
    aggregationType: string;
    optionSet: Maybe<OptionSet>;
    mandatory: boolean;
    /** The rules that hide it. */
    visibility: VisibilityRule[];
};

/** The ids in the resources attribute, "ID1;ID2", also in the documented format "(ID1;ID2)". */
export function getResourceIds(program: Program, attributeId: Maybe<Id>): Id[] {
    if (!attributeId) return [];
    const value = program.attributeValues.find(v => v.attributeId === attributeId)?.value ?? "";

    return value
        .replace(/[()]/g, "")
        .split(";")
        .map(id => id.trim())
        .filter(Boolean);
}

export type ProgramResourceType = "dashboards" | "visualizations" | "eventCharts" | "eventReports";

export type ProgramResource = NamedRef & { description: string; type: ProgramResourceType };
