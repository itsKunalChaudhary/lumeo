"use client";
import GhostExtension from "./extension";
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./menu-bar";
import Text from "@tiptap/extension-text";
import { Button } from "@/components/ui/button";

import { generate } from './action';
import { readStreamableValue } from 'ai/rsc';
import { api } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import TagInput from "./tag-input";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useLocalStorage } from "usehooks-ts";
import AIComposeButton from "./ai-compose-button";

type EmailEditorProps = {
    toValues: { label: string, value: string }[];
    ccValues: { label: string, value: string }[];

    subject: string;
    setSubject: (subject: string) => void;
    to: string[]
    handleSend: (value: string) => void;
    isSending: boolean;

    onToChange: (values: { label: string, value: string }[]) => void;
    onCcChange: (values: { label: string, value: string }[]) => void;

    defaultToolbarExpand?: boolean;
    defaultBody?: string;
    onBodyChange?: (html: string) => void;
    handleSaveDraft?: (value: string) => void;
    isSavingDraft?: boolean;
}

const EmailEditor = ({ toValues, ccValues, subject, setSubject, to, handleSend, isSending, onToChange, onCcChange, defaultToolbarExpand, defaultBody, onBodyChange, handleSaveDraft, isSavingDraft }: EmailEditorProps) => {

    const [ref] = useAutoAnimate();
    const [accountId] = useLocalStorage('accountId', '');
    const { data: suggestions } = api.mail.getEmailSuggestions.useQuery({ accountId: accountId, query: '' }, { enabled: !!accountId });


    const [expanded, setExpanded] = React.useState(defaultToolbarExpand ?? false);

    const editorRef = React.useRef<ReturnType<typeof useEditor>>(null);

    const aiGenerate = async (prompt: string) => {
        const { output } = await generate(prompt)
        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                editorRef.current?.commands.insertContent(delta);
            }
        }
    }

    const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

    const customText = Text.extend({
        addKeyboardShortcuts() {
            return {
                "Mod-j": () => {
                    const text = this.editor.getText();
                    this.editor.commands.clearContent();
                    void aiGenerate(text);
                    return true;
                },
            };
        },
    });


    const editor = useEditor({
        autofocus: false,
        extensions: [StarterKit, customText, GhostExtension],
        content: defaultBody,
        editorProps: {
            attributes: {
                placeholder: "Write your email here..."
            }
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            setValue(html)
            onBodyChange?.(html)
        }
    });

    // Keep ref in sync so aiGenerate closure always has the latest editor instance
    React.useEffect(() => {
        (editorRef as React.MutableRefObject<typeof editor>).current = editor;
    }, [editor]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && editor && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                editor.commands.focus();
            }
            if (event.key === 'Escape' && editor) {
                editor.commands.blur();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [editor]);

    const [value, setValue] = React.useState(defaultBody ?? '');




    return (
        <div>
            <div className="flex p-4 py-2 border-b">
                {editor && <TipTapMenuBar editor={editor} />}
            </div>

            <div ref={ref} className="p-4 pb-0 space-y-2">
                {expanded && (
                    <>
                        <TagInput suggestions={suggestions?.map(s => s.address) || []} value={toValues} placeholder="Add tags" label="To" onChange={onToChange} />
                        <TagInput suggestions={suggestions?.map(s => s.address) || []} value={ccValues} placeholder="Add tags" label="Cc" onChange={onCcChange} />
                        <Input id="subject" className="w-full" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                    </>
                )}
                <div className="flex items-center gap-2">
                    <div className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
                        <span className="text-green-600 font-medium">
                            Draft{' '}
                        </span>
                        <span>
                            to {to.join(', ')}
                        </span>
                    </div>
                    <AIComposeButton
                        isComposing={defaultToolbarExpand}
                        onGenerateStart={() => editor?.commands.clearContent()}
                        onGenerate={(delta) => editor?.commands.insertContent(delta)}
                    />
                </div>
            </div>

            <div className="prose dark:prose-invert w-full px-4 relative overflow-y-auto min-h-[80px] max-h-[200px]">
                <EditorContent value={value} editor={editor} placeholder="Write your email here..." />
                {value.trim() && (
                    <p className="not-prose text-xs text-muted-foreground/50 mt-1 select-none">
                        {isMac ? 'Cmd' : 'Ctrl'}+J for AI autocomplete
                    </p>
                )}
            </div>
            <div className="flex justify-end items-center gap-2 px-4 py-2">
                {handleSaveDraft && (
                    <Button variant="outline" disabled={isSavingDraft} onClick={() => handleSaveDraft(value)}>
                        {isSavingDraft ? 'Saving...' : 'Save to Draft'}
                    </Button>
                )}
                <Button onClick={async () => { editor?.commands.clearContent(); await handleSend(value) }} isLoading={isSending}>
                    Send
                </Button>
            </div>
        </div>
    );
};

export default EmailEditor;
