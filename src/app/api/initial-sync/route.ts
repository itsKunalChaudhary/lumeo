import Account from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

export const maxDuration = 300

export const POST = async (req: NextRequest) => {
    const body = await req.json()
    const { accountId, userId } = body
    if (!accountId || !userId) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const dbAccount = await db.account.findUnique({
        where: {
            id: accountId,
            userId,
        }
    })
    if (!dbAccount) return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });

    // Reset delta token so getSyncStatus shows loading spinner during re-sync
    await db.account.update({
        where: { id: accountId },
        data: { nextDeltaToken: null }
    })

    const account = new Account(dbAccount.token)
    try {
        await account.createSubscription()
    } catch (err) {
        // Subscription creation can fail in dev (localhost not reachable by Aurinko)
        // or if a subscription already exists — neither should block the email sync.
        console.warn('createSubscription failed (non-fatal):', err)
    }
    const response = await account.performInitialSync()
    if (!response) return NextResponse.json({ error: "FAILED_TO_SYNC" }, { status: 500 });

    const { deltaToken, emails } = response

    await syncEmailsToDatabase(emails, accountId)

    await db.account.update({
        where: {
            token: dbAccount.token,
        },
        data: {
            nextDeltaToken: deltaToken,
        },
    });
    console.log('sync complete', deltaToken)
    return NextResponse.json({ success: true, deltaToken }, { status: 200 });

}