import React from "react";
import DOMPurify from "dompurify";

/** Descriptions are rich HTML written by users in the editor: always sanitized. */
export const HtmlContent: React.FC<{ html: string }> = React.memo(({ html }) => {
    const clean = React.useMemo(() => DOMPurify.sanitize(html), [html]);
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
});
