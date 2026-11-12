import React from "react";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/plugins/advlist";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/preview";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import contentUiCss from "tinymce/skins/ui/oxide/content.css?inline";
import contentCss from "tinymce/skins/content/default/content.css?inline";

export type RichTextEditorProps = {
    /** Only read when the editor is created: to load other content, remount it with a new key. */
    initialValue: string;
    /** Called only for edits by the user, not for the initial content. */
    onChange: (html: string) => void;
    rtl?: boolean;
};

/**
 * TinyMCE, self-hosted and with the same plugins and toolbar as the Angular app.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = React.memo(props => {
    const { initialValue, onChange, rtl } = props;
    // The content as the editor normalizes it, to tell the user's edits from the initial load
    const baseline = React.useRef<string>();

    return (
        <Editor
            licenseKey="gpl"
            initialValue={initialValue}
            onInit={(_event, editor) => {
                baseline.current = editor.getContent();
            }}
            onEditorChange={html => {
                if (html !== baseline.current) onChange(html);
            }}
            init={{
                menubar: false,
                toolbar_mode: "wrap",
                branding: false,
                promotion: false,
                resize: true,
                height: 480,
                plugins: "link image table lists advlist preview wordcount",
                toolbar:
                    "undo redo | styles | fontsize | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | table | preview",
                font_size_formats: "8pt 10pt 12pt 14pt 18pt 24pt 36pt",
                directionality: rtl ? "rtl" : "ltr",
                skin: false,
                content_css: false,
                content_style: [contentCss, contentUiCss].join("\n"),
            }}
        />
    );
});
