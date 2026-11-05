import { Maybe } from "$/utils/ts-utils";
import { OptionSet } from "./OptionSet";
import { VisibilityRule } from "./ProgramRule";
import { Id, NamedRef } from "./Ref";

export type Program = NamedRef & {
    description: string;
    stageIds: Id[];
    /** From the attribute with code HMIS-Dict_Resources, split by ";". */
    resourceIds: Id[];
};

export type ProgramAttribute = NamedRef & {
    shortName: string;
    formName: string;
    description: string;
    valueType: string;
    aggregationType: string;
    optionSet: Maybe<OptionSet>;
    mandatory: boolean;
    /** Always empty for now: bug P10, kept until the end. */
    visibility: VisibilityRule[];
};

export type ProgramResourceType = "dashboards" | "visualizations" | "eventCharts" | "eventReports";

export type ProgramResource = NamedRef & { description: string; type: ProgramResourceType };
