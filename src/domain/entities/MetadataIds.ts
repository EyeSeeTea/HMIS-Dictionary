import { Id } from "./Ref";

/** Metadata the app relies on, chosen per instance in the Admin panel. */
export type MetadataIds = {
    /** Advanced users of the screens whose layout settings were never saved. */
    advancedUserGroup: Id;
    /** The visualizations of indicators are shared with it, if it exists. */
    allUsersGroup: Id;
    /** The health service codes of data sets (and checked on indicator groups too). */
    healthServiceAttribute: Id;
    /** The ICD-10 code of data elements, in Search. */
    icd10Attribute: Id;
    /** The resources of programs (dashboards, visualizations...), as "ID1;ID2". */
    programResourcesAttribute: Id;
};

/** The UIDs of the MSF instance, the values when nothing is saved. */
export const defaultMetadataIds: MetadataIds = {
    advancedUserGroup: "LjRqO9XzQPs",
    allUsersGroup: "epFY01iJN0Z",
    healthServiceAttribute: "pG4YeQyynJh",
    icd10Attribute: "zC3TBJnSxar",
    programResourcesAttribute: "Q5alUdMbT9g",
};
