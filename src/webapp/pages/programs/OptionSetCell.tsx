import React from "react";
import { OptionSet } from "$/domain/entities/OptionSet";
import { Maybe } from "$/utils/ts-utils";
import { programTexts } from "$/webapp/pages/programs/programTexts";

/** The name of the option set and a read-only list of its options. */
export const OptionSetCell: React.FC<{ optionSet: Maybe<OptionSet> }> = React.memo(
    ({ optionSet }) => {
        if (!optionSet || optionSet.options.length === 0) return null;

        return (
            <div>
                <p>
                    {programTexts.dos_OptionSetName()}: {optionSet.name}
                </p>
                <select defaultValue="" aria-label={programTexts.dos_SeeOptions()}>
                    <option value="">{programTexts.dos_SeeOptions()}</option>
                    {optionSet.options.map(option => (
                        <option key={option.id} disabled>
                            {option.name}
                        </option>
                    ))}
                </select>
            </div>
        );
    }
);
