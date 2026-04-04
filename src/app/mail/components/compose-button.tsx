'use client'
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Pencil, X } from "lucide-react"

import React from 'react'
import EmailEditor, { type AttachmentFile } from "./email-editor"
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { toast } from "sonner"

const ComposeButton = ({ isCollapsed }: { isCollapsed?: boolean }) => {
    const [open, setOpen] = React.useState(false)
    const [accountId] = useLocalStorage('accountId', '')
    const [toValues, setToValues] = React.useState<{ label: string; value: string; }[]>([])
    const [ccValues, setCcValues] = React.useState<{ label: string; value: string; }[]>([])
    const [subject, setSubject] = React.useState<string>('')
    const [draftBody, setDraftBody] = useLocalStorage('normalhuman-draft-body', '')
    const { data: account } = api.mail.getMyAccount.useQuery({ accountId })


    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && (event.ctrlKey || event.metaKey) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const sendEmail = api.mail.sendEmail.useMutation()
    const saveDraft = api.mail.saveDraft.useMutation()

    const handleSaveDraft = async (value: string) => {
        if (!account) return
        saveDraft.mutate({
            accountId,
            body: value,
            subject,
            from: { name: account.name ?? 'Me', address: account.emailAddress ?? 'me@example.com' },
            to: toValues.map(to => ({ name: to.value, address: to.value })),
            cc: ccValues.map(cc => ({ name: cc.value, address: cc.value })),
            replyTo: { name: account.name ?? 'Me', address: account.emailAddress ?? 'me@example.com' },
        }, {
            onSuccess: () => {
                toast.success("Draft saved")
                setOpen(false)
                setDraftBody('')
                setToValues([])
                setCcValues([])
                setSubject('')
            },
            onError: (error) => {
                toast.error("Failed to save draft: " + error.message)
            }
        })
    }

    const handleSend = async (value: string, attachments: AttachmentFile[]) => {
        console.log(account)
        console.log({ value })
        if (!account) return
        sendEmail.mutate({
            accountId,
            threadId: undefined,
            body: value,
            subject,
            from: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            to: toValues.map(to => ({ name: to.value, address: to.value })),
            cc: ccValues.map(cc => ({ name: cc.value, address: cc.value })),
            replyTo: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            inReplyTo: undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
        }, {
            onSuccess: () => {
                toast.success("Email sent")
                setOpen(false)
                setDraftBody('')
                setToValues([])
                setCcValues([])
                setSubject('')
            },
            onError: (error) => {
                console.log(error)
                toast.error(error.message)
            }
        })
    }


    return (
        <Drawer open={open} onOpenChange={setOpen}>
            {isCollapsed ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DrawerTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Pencil className='size-4' />
                            </Button>
                        </DrawerTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">Compose</TooltipContent>
                </Tooltip>
            ) : (
                <DrawerTrigger asChild>
                    <Button>
                        <Pencil className='size-4 mr-1' />
                        Compose
                    </Button>
                </DrawerTrigger>
            )}
            <DrawerContent className="">
                <DrawerHeader>
                    <div className="flex items-center justify-between">
                        <DrawerTitle>Compose Email</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </DrawerClose>
                    </div>
                    <EmailEditor
                        toValues={toValues}
                        ccValues={ccValues}

                        onToChange={(values) => {
                            setToValues(values)
                        }}
                        onCcChange={(values) => {
                            setCcValues(values)
                        }}

                        subject={subject}
                        setSubject={setSubject}

                        to={toValues.map(to => to.value)}
                        handleSend={handleSend}
                        isSending={sendEmail.isPending}

                        defaultBody={draftBody || undefined}
                        onBodyChange={setDraftBody}

                        handleSaveDraft={handleSaveDraft}
                        isSavingDraft={saveDraft.isPending}

                        defaultToolbarExpand
                    />
                </DrawerHeader>
            </DrawerContent>

        </Drawer>
    )
}

export default ComposeButton