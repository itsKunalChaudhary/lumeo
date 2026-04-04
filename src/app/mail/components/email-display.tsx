'use client'
import Avatar from 'react-avatar';
import { Letter } from 'react-letter';
import { type RouterOutputs } from '@/trpc/react'
import React from 'react'
import useThreads from '../use-threads';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Download, File, FileText, Image } from 'lucide-react';

type Props = {
    email: RouterOutputs['mail']['getThreads'][number]['emails'][number]
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
    if (mimeType.startsWith('image/')) return <Image className="size-4 shrink-0 text-blue-500" />;
    if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="size-4 shrink-0 text-red-500" />;
    return <File className="size-4 shrink-0 text-muted-foreground" />;
}

const EmailDisplay = ({ email }: Props) => {
    const { account } = useThreads()
    const letterRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (letterRef.current) {
            const gmailQuote = letterRef.current.querySelector('div[class*="_gmail_quote"]');
            if (gmailQuote) {
                gmailQuote.innerHTML = '';
            }
        }
    }, [email]);

    const isMe = account?.emailAddress === email.from.address
    const nonInlineAttachments = email.attachments?.filter(a => !a.inline) ?? [];

    return (
        <div className={cn('border rounded-md p-4 cursor-pointer transition-all  hover:translate-x-2', {
            'border-l-gray-900 border-l-4': isMe
        })} ref={letterRef}>
            <div className="flex items-center justify-between gap-2">
                <div className='flex items-center gap-2'>
                    {!isMe && <Avatar name={email.from.name ?? email.from.address} email={email.from.address} size='35' textSizeRatio={2} round={true} />}
                    <span className='font-medium'>
                        {isMe ? 'Me' : email.from.address}
                    </span>
                </div>
                <p className='text-xs text-muted-foreground'>
                    {formatDistanceToNow(email.sentAt ?? new Date(), {
                        addSuffix: true,
                    })}
                </p>
            </div>
            <div className="h-4"></div>
            <Letter className='bg-white rounded-md text-black' html={email?.body ?? ""} />

            {nonInlineAttachments.length > 0 && (
                <div className="mt-4 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                        {nonInlineAttachments.length} attachment{nonInlineAttachments.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {nonInlineAttachments.map(att => (
                            <a
                                key={att.id}
                                href={`/api/attachments/${att.id}`}
                                download={att.name}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-2 rounded-md border bg-muted/50 hover:bg-muted px-3 py-2 text-xs transition-colors max-w-[220px] group"
                            >
                                <AttachmentIcon mimeType={att.mimeType} />
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="truncate font-medium">{att.name}</span>
                                    <span className="text-muted-foreground">{formatBytes(att.size)}</span>
                                </div>
                                <Download className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default EmailDisplay
