import React from "react";
import { SideMenu } from "$/webapp/components/side-menu/SideMenu";
import css from "./AppLayout.module.css";

/** Left vertical menu + page. The header bar is rendered above, by `App`. */
export const AppLayout: React.FC<React.PropsWithChildren> = React.memo(({ children }) => {
    return (
        <div className={css.layout}>
            <SideMenu />
            <main id="view-container" className={css.page}>
                {children}
            </main>
        </div>
    );
});
