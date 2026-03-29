import { getAccountDetails, getAurinkoToken } from "@/lib/aurinko";
import { waitUntil } from '@vercel/functions'
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const params = req.nextUrl.searchParams
    const status = params.get('status');
    if (status !== 'success') return NextResponse.json({ error: "Account connection failed" }, { status: 400 });

    const code = params.get('code');
    const token = await getAurinkoToken(code as string)
    if (!token) return NextResponse.json({ error: "Failed to fetch token" }, { status: 400 });
    const accountDetails = await getAccountDetails(token.accessToken)

    // Aurinko returns a different accountId on every OAuth flow for the same email,
    // so we cannot upsert by Aurinko's accountId. Instead, look up the existing
    // account by emailAddress + userId to avoid creating duplicate accounts.
    const existingAccount = await db.account.findFirst({
        where: { userId, emailAddress: accountDetails.email }
    })

    let accountId: string
    if (existingAccount) {
        await db.account.update({
            where: { id: existingAccount.id },
            data: { token: token.accessToken }
        })
        accountId = existingAccount.id
    } else {
        await db.account.create({
            data: {
                id: token.accountId.toString(),
                userId,
                token: token.accessToken,
                provider: 'Aurinko',
                emailAddress: accountDetails.email,
                name: accountDetails.name
            }
        })
        accountId = token.accountId.toString()
    }

    waitUntil(
        axios.post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, { accountId, userId }).then((res) => {
            console.log(res.data)
        }).catch((err) => {
            console.log(err.response?.data)
        })
    )

    return NextResponse.redirect(new URL('/mail', req.url))
}