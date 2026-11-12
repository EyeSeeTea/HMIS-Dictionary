import { Maybe } from "$/utils/ts-utils";
import { Id } from "./Ref";

/** Metadata the app relies on, chosen per instance in the Admin panel. All optional: cleared, the feature that uses it does nothing. */
export type MetadataIds = {
    /** Advanced users of the screens whose layout settings were never saved. */
    advancedUserGroup: Maybe<Id>;
    /** The visualizations of indicators are shared with it, if it exists. */
    allUsersGroup: Maybe<Id>;
    /** The health service codes of data sets (and checked on indicator groups too). */
    healthServiceAttribute: Maybe<Id>;
    /** The ICD-10 code of data elements, in Search. */
    icd10Attribute: Maybe<Id>;
    /** The resources of programs (dashboards, visualizations...), as "ID1;ID2". */
    programResourcesAttribute: Maybe<Id>;
};

/** The UIDs of the MSF instance, the values when nothing is saved. */
export const defaultMetadataIds: Record<keyof MetadataIds, Id> = {
    advancedUserGroup: "LjRqO9XzQPs",
    allUsersGroup: "epFY01iJN0Z",
    healthServiceAttribute: "pG4YeQyynJh",
    icd10Attribute: "zC3TBJnSxar",
    programResourcesAttribute: "Q5alUdMbT9g",
};
