import { NamedRef } from "./Ref";
import { AttributeValue } from "./Shared";

export type DossierCandidate = NamedRef & { attributeValues: AttributeValue[] };

export type DossierElement = NamedRef & { formName: string; description: string };

export type DossierSection = NamedRef & { dataElements: DossierElement[] };

export type DossierDataSet = NamedRef & { sections: DossierSection[] };

export type DossierIndicatorGroup = NamedRef & { indicators: DossierElement[] };
