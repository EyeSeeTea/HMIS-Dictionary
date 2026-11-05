import React from "react";
import { NoticeBox } from "@dhis2/ui";
import i18n from "$/utils/i18n";

type State = { hasError: boolean };

/** Keeps a render error inside this part of the page, with a message instead of its content. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error): void {
        console.error(error);
    }

    render(): React.ReactNode {
        if (!this.state.hasError) return this.props.children;

        return (
            <div data-test="error-boundary">
                <NoticeBox error title={i18n.t("Something went wrong")}>
                    {i18n.t(
                        "Reload the page. If the problem persists, contact your administrator."
                    )}
                </NoticeBox>
            </div>
        );
    }
}
