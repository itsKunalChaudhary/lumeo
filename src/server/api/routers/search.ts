import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { authoriseAccountAccess } from "./mail";
import { OramaManager } from "@/lib/orama";
import { getEmbeddings } from "@/lib/embeddings";

export const searchRouter = createTRPCRouter({
    search: protectedProcedure.input(z.object({
        accountId: z.string(),
        query: z.string(),
    })).mutation(async ({ input, ctx }) => {
        const account = await ctx.db.account.findFirst({
            where: {
                id: input.accountId,
                userId: ctx.auth.userId,
            },
            select: {
                id: true
            }
        })

        if (!account) throw new Error("Invalid token")
        const oramaManager = new OramaManager(account.id);
        await oramaManager.initialize();


        const { query } = input;
        const results = await oramaManager.search({ term: query });

        // Orama index empty (built before embeddings were generated) — fall back to DB
        if (results.hits.length === 0) {
            const emails = await ctx.db.email.findMany({
                where: {
                    thread: { accountId: account.id },
                    OR: [
                        { subject: { contains: query, mode: 'insensitive' } },
                        { bodySnippet: { contains: query, mode: 'insensitive' } },
                        { from: { address: { contains: query, mode: 'insensitive' } } },
                        { from: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                },
                take: 15,
                include: {
                    from: { select: { name: true, address: true } },
                    to: { select: { address: true } },
                },
            })
            return {
                hits: emails.map(e => ({
                    id: e.id,
                    score: 1,
                    document: {
                        title: e.subject ?? '',
                        body: e.bodySnippet ?? '',
                        rawBody: e.bodySnippet ?? '',
                        from: `${e.from?.name ?? ''} <${e.from?.address ?? ''}>`,
                        to: e.to.map(t => t.address),
                        sentAt: e.sentAt?.toISOString() ?? '',
                        threadId: e.threadId,
                    },
                })),
            } as typeof results
        }

        return results
    }),
});
