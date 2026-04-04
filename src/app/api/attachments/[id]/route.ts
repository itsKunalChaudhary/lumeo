import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getFromS3AsBuffer } from '@/lib/s3';
import axios from 'axios';

export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const attachment = await db.emailAttachment.findUnique({
        where: { id },
        include: {
            Email: {
                include: {
                    thread: {
                        include: { account: { select: { userId: true, token: true } } }
                    }
                }
            }
        }
    });

    if (!attachment) {
        return new NextResponse('Not found', { status: 404 });
    }

    if (attachment.Email.thread.account.userId !== userId) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const contentDisposition = `attachment; filename="${attachment.name}"`;

    if (attachment.s3Key) {
        const buf = await getFromS3AsBuffer(attachment.s3Key);
        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': attachment.mimeType,
                'Content-Disposition': contentDisposition,
                'Content-Length': buf.length.toString(),
            },
        });
    }

    if (attachment.content) {
        const buf = Buffer.from(attachment.content, 'base64');
        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': attachment.mimeType,
                'Content-Disposition': contentDisposition,
                'Content-Length': buf.length.toString(),
            },
        });
    }

    // Fallback: fetch directly from Aurinko using the email message ID and attachment ID
    const token = attachment.Email.thread.account.token;
    const messageId = attachment.Email.id;
    if (token && messageId && attachment.id) {
        try {
            const res = await axios.get<ArrayBuffer>(
                `https://api.aurinko.io/v1/email/messages/${messageId}/attachments/${attachment.id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'arraybuffer',
                }
            );
            const buf = Buffer.from(res.data);
            return new NextResponse(new Uint8Array(buf), {
                headers: {
                    'Content-Type': attachment.mimeType,
                    'Content-Disposition': contentDisposition,
                    'Content-Length': buf.length.toString(),
                },
            });
        } catch {
            return new NextResponse('Could not fetch attachment from mail provider', { status: 502 });
        }
    }

    return new NextResponse('No content available', { status: 404 });
}
