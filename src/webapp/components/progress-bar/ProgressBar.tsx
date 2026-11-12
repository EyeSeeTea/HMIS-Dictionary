import React from "react";
import { LinearLoader } from "@dhis2/ui";
import { Progress } from "$/domain/entities/Shared";
import { Maybe } from "$/utils/ts-utils";
import css from "./ProgressBar.module.css";

/** Progress of the describe use cases (`onProgress`). Hidden when there is nothing to report. */
export const ProgressBar: React.FC<{ progress: Maybe<Progress>; label?: string }> = React.memo(
    ({ progress, label }) => {
        if (!progress || progress.total === 0 || progress.current >= progress.total) return null;
        const percent = Math.round((progress.current / progress.total) * 100);

        return (
            <div className={`${css.bar} no-print`} role="progressbar" aria-valuenow={percent}>
                {label && (
                    <span>
                        {label} ({progress.current}/{progress.total})
                    </span>
                )}
                <LinearLoader amount={percent} />
            </div>
        );
    }
);
