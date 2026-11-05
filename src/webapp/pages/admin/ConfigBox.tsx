import React from "react";
import css from "./Admin.module.css";

export type ConfigStatus = "pending" | "ok" | "error";

const alertClass: Record<ConfigStatus, string> = {
    pending: "alert-warning",
    ok: "alert-success",
    error: "alert-danger",
};

/** One configuration check, coloured by its result. The classes and ids are the Angular ones. */
export const ConfigBox: React.FC<{
    status: ConfigStatus;
    id?: string;
    children: React.ReactNode;
}> = React.memo(({ status, id, children }) => (
    <div
        id={id}
        className={`${css.box} ${css[status]} alert ${alertClass[status]}`}
        data-status={status}
    >
        {children}
    </div>
));

/** The explanation next to a check. */
export const DetailsBox: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
    <div className={`${css.box} ${css.details}`}>{children}</div>
));
