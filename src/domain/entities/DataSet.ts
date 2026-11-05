import { Struct } from "./generic/Struct";
import { Id, NamedRef } from "./Ref";

export type DataSetElement = NamedRef & {
    shortName: string;
    formName: string;
    description: string;
    valueType: string;
    optionNames: string[];
    /** The data set's override, or else the data element's own. */
    categoryCombo: NamedRef;
};

export type DataSetSection = NamedRef & { description: string; dataElements: DataSetElement[] };

export type CategoryCombo = NamedRef & { categories: { name: string; items: string[] }[] };

export type DataSetAttrs = {
    id: Id;
    name: string;
    description: string;
    /** If there are none, one virtual section with id "DataElements". */
    sections: DataSetSection[];
    hasRealSections: boolean;
    /** All its elements, also those outside sections. They find its indicators. */
    dataElementIds: Id[];
};

export class DataSet extends Struct<DataSetAttrs>() {
    categoryComboIds(): Id[] {
        const ids = this.sections.flatMap(section =>
            section.dataElements.map(dataElement => dataElement.categoryCombo.id)
        );

        return Array.from(new Set(ids));
    }
}
