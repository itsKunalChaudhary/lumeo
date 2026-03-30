import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import Account from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { getEmailDetails } from "@/lib/aurinko";
import type { Prisma } from "@prisma/client";
import { emailAddressSchema } from "@/lib/types";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";
import axios from "axios";

export const authoriseAccountAccess = async (accountId: string, userId: string) => {
    const account = await db.account.findFirst({
        where: {
            id: accountId,
            userId: userId,
        },
        select: {
            id: true, emailAddress: true, name: true, token: true
        }
    })
    if (!account) throw new Error("Invalid token")
    return account
}

const inboxFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    inboxStatus: true,
    trashStatus: false,
})

const sentFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    sentStatus: true,
    trashStatus: false,
})

const draftFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    draftStatus: true,
    trashStatus: false,
})

const trashFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    trashStatus: true,
})

export const mailRouter = createTRPCRouter({
    getAccounts: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.db.account.findMany({
            where: {
                userId: ctx.auth.userId,
            }, select: {
                id: true, emailAddress: true, name: true
            }
        })
    }),
    getNumThreads: protectedProcedure.input(z.object({
        accountId: z.string(),
        tab: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        let filter: Prisma.ThreadWhereInput = {}
        if (input.tab === "inbox") {
            filter = inboxFilter(account.id)
        } else if (input.tab === "sent") {
            filter = sentFilter(account.id)
        } else if (input.tab === "drafts") {
            filter = draftFilter(account.id)
        } else if (input.tab === "trash") {
            filter = trashFilter(account.id)
        }
        return await ctx.db.thread.count({
            where: filter
        })
    }),
    getThreads: protectedProcedure.input(z.object({
        accountId: z.string(),
        tab: z.string(),
        done: z.boolean()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        let filter: Prisma.ThreadWhereInput = {}
        if (input.tab === "inbox") {
            filter = inboxFilter(account.id)
        } else if (input.tab === "sent") {
            filter = sentFilter(account.id)
        } else if (input.tab === "drafts") {
            filter = draftFilter(account.id)
        } else if (input.tab === "trash") {
            filter = trashFilter(account.id)
        }

        if (input.tab !== "trash") {
            filter.done = { equals: input.done }
            const fiftyDaysAgo = new Date()
            fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50)
            filter.lastMessageDate = { gte: fiftyDaysAgo }
        }

        const threads = await ctx.db.thread.findMany({
            where: filter,
            include: {
                emails: {
                    orderBy: {
                        sentAt: "asc"
                    },
                    select: {
                        from: true,
                        body: true,
                        bodySnippet: true,
                        emailLabel: true,
                        subject: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true
                    }
                }
            },
            take: 50,
            orderBy: {
                lastMessageDate: "desc"
            }
        })
        return threads
    }),

    getThreadById: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await ctx.db.thread.findUnique({
            where: { id: input.threadId },
            include: {
                emails: {
                    orderBy: {
                        sentAt: "asc"
                    },
                    select: {
                        from: true,
                        body: true,
                        subject: true,
                        bodySnippet: true,
                        emailLabel: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true
                    }
                }
            },
        })
    }),

    getReplyDetails: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string(),
        replyType: z.enum(['reply', 'replyAll'])
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        const thread = await ctx.db.thread.findUnique({
            where: { id: input.threadId },
            include: {
                emails: {
                    orderBy: { sentAt: 'asc' },
                    select: {
                        from: true,
                        to: true,
                        cc: true,
                        bcc: true,
                        sentAt: true,
                        subject: true,
                        internetMessageId: true,
                    },
                },
            },
        });

        if (!thread || thread.emails.length === 0) {
            throw new Error("Thread not found or empty");
        }

        const lastExternalEmail = thread.emails
            .reverse()
            .find(email => email.from.id !== account.id);

        if (!lastExternalEmail) {
            throw new Error("No external email found in thread");
        }

        const allRecipients = new Set([
            ...thread.emails.flatMap(e => [e.from, ...e.to, ...e.cc]),
        ]);

        if (input.replyType === 'reply') {
            return {
                to: [lastExternalEmail.from],
                cc: [],
                from: { name: account.name, address: account.emailAddress },
                subject: `${lastExternalEmail.subject}`,
                id: lastExternalEmail.internetMessageId
            };
        } else if (input.replyType === 'replyAll') {
            return {
                to: [lastExternalEmail.from, ...lastExternalEmail.to.filter(addr => addr.id !== account.id)],
                cc: lastExternalEmail.cc.filter(addr => addr.id !== account.id),
                from: { name: account.name, address: account.emailAddress },
                subject: `${lastExternalEmail.subject}`,
                id: lastExternalEmail.internetMessageId
            };
        }
    }),

    syncEmails: protectedProcedure.input(z.object({
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        const acc = new Account(account.token)
        try {
            await acc.syncEmails()
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'AURINKO_TOKEN_DEAD',
                })
            }
            throw error
        }
    }),
    resetAccount: protectedProcedure.input(z.object({
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        const threadIds = (await ctx.db.thread.findMany({
            where: { accountId: account.id },
            select: { id: true }
        })).map(t => t.id)

        const emailIds = (await ctx.db.email.findMany({
            where: { threadId: { in: threadIds } },
            select: { id: true }
        })).map(e => e.id)

        // Delete leaf records first
        await ctx.db.emailAttachment.deleteMany({ where: { emailId: { in: emailIds } } })

        // Clear implicit many-to-many join rows (to/cc/bcc/replyTo ↔ EmailAddress)
        for (const emailId of emailIds) {
            await ctx.db.email.update({
                where: { id: emailId },
                data: { to: { set: [] }, cc: { set: [] }, bcc: { set: [] }, replyTo: { set: [] } }
            })
        }

        await ctx.db.email.deleteMany({ where: { threadId: { in: threadIds } } })
        await ctx.db.thread.deleteMany({ where: { accountId: account.id } })
        await ctx.db.emailAddress.deleteMany({ where: { accountId: account.id } })
        await ctx.db.account.update({
            where: { id: account.id },
            data: { nextDeltaToken: null }
        })
    }),
    setUndone: protectedProcedure.input(z.object({
        threadId: z.string().optional(),
        threadIds: z.array(z.string()).optional(),
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        if (input.threadId) {
            await ctx.db.thread.update({
                where: {
                    id: input.threadId
                },
                data: {
                    done: false
                }
            })
        }
        if (input.threadIds) {
            await ctx.db.thread.updateMany({
                where: {
                    id: {
                        in: input.threadIds
                    }
                },
                data: {
                    done: false
                }
            })
        }
    }),
    setDone: protectedProcedure.input(z.object({
        threadId: z.string().optional(),
        threadIds: z.array(z.string()).optional(),
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        if (!input.threadId && !input.threadIds) throw new Error("No threadId or threadIds provided")
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        if (input.threadId) {
            await ctx.db.thread.update({
                where: {
                    id: input.threadId
                },
                data: {
                    done: true
                }
            })
        }
        if (input.threadIds) {
            await ctx.db.thread.updateMany({
                where: {
                    id: {
                        in: input.threadIds
                    }
                },
                data: {
                    done: true
                }
            })
        }
    }),
    setTrash: protectedProcedure.input(z.object({
        threadId: z.string(),
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        await ctx.db.thread.update({
            where: { id: input.threadId },
            data: {
                trashStatus: true,
                inboxStatus: false,
                sentStatus: false,
                draftStatus: false,
            }
        })
    }),
    getEmailDetails: protectedProcedure.input(z.object({
        emailId: z.string(),
        accountId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await getEmailDetails(account.token, input.emailId)
    }),
    sendEmail: protectedProcedure.input(z.object({
        accountId: z.string(),
        body: z.string(),
        subject: z.string(),
        from: emailAddressSchema,
        to: z.array(emailAddressSchema),
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        replyTo: emailAddressSchema,
        inReplyTo: z.string().optional(),
        threadId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
        const acc = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        const account = new Account(acc.token)
        console.log('sendmail', input)
        await account.sendEmail({
            body: input.body,
            subject: input.subject,
            threadId: input.threadId,
            to: input.to,
            bcc: input.bcc,
            cc: input.cc,
            replyTo: input.replyTo,
            from: input.from,
            inReplyTo: input.inReplyTo,
        })
    }),
    saveDraft: protectedProcedure.input(z.object({
        accountId: z.string(),
        body: z.string(),
        subject: z.string(),
        from: emailAddressSchema,
        to: z.array(emailAddressSchema),
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        replyTo: emailAddressSchema,
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        const now = new Date()

        // Helper: find or create an EmailAddress in this account
        const upsertAddr = (addr: { name: string; address: string }) =>
            ctx.db.emailAddress.upsert({
                where: { accountId_address: { accountId: account.id, address: addr.address } },
                create: { accountId: account.id, address: addr.address, name: addr.name },
                update: {},
            })

        const fromAddr = await upsertAddr(input.from)
        const toAddrs = await Promise.all(input.to.map(upsertAddr))
        const ccAddrs = await Promise.all((input.cc ?? []).map(upsertAddr))

        await ctx.db.thread.create({
            data: {
                subject: input.subject || '(no subject)',
                lastMessageDate: now,
                participantIds: [input.from.address, ...input.to.map(t => t.address)],
                accountId: account.id,
                draftStatus: true,
                inboxStatus: false,
                sentStatus: false,
                emails: {
                    create: {
                        subject: input.subject || '(no subject)',
                        body: input.body,
                        bodySnippet: input.body.replace(/<[^>]*>/g, '').slice(0, 200),
                        createdTime: now,
                        lastModifiedTime: now,
                        sentAt: now,
                        receivedAt: now,
                        internetMessageId: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        hasAttachments: false,
                        emailLabel: 'draft',
                        from: { connect: { id: fromAddr.id } },
                        to: toAddrs.length ? { connect: toAddrs.map(a => ({ id: a.id })) } : undefined,
                        cc: ccAddrs.length ? { connect: ccAddrs.map(a => ({ id: a.id })) } : undefined,
                    },
                },
            },
        })
    }),
    getEmailSuggestions: protectedProcedure.input(z.object({
        accountId: z.string(),
        query: z.string(),
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await ctx.db.emailAddress.findMany({
            where: {
                accountId: input.accountId,
                OR: [
                    {
                        address: {
                            contains: input.query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        name: {
                            contains: input.query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            select: {
                address: true,
                name: true,
            },
            take: 10,
        })
    }),
    getMyAccount: protectedProcedure.input(z.object({
        accountId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return account
    }),
    getChatbotInteraction: protectedProcedure.query(async ({ ctx }) => {
        const chatbotInteraction = await ctx.db.chatbotInteraction.findUnique({
            where: {
                day: new Date().toDateString(),
                userId: ctx.auth.userId
            }, select: { count: true }
        })
        const remainingCredits = FREE_CREDITS_PER_DAY - (chatbotInteraction?.count || 0)
        return {
            remainingCredits
        }
    }),
});