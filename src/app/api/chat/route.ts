import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";

import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";

// export const runtime = "edge";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const isSubscribed = await getSubscriptionStatus()
        const today = new Date().toDateString()
        if (!isSubscribed) {
            const chatbotInteraction = await db.chatbotInteraction.findUnique({
                where: { userId }
            })
            if (chatbotInteraction) {
                if (chatbotInteraction.day !== today) {
                    // New day — reset count
                    await db.chatbotInteraction.update({
                        where: { userId },
                        data: { day: today, count: 0 }
                    })
                } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
                    return NextResponse.json({ error: "Limit reached" }, { status: 429 });
                }
            }
        }
        const { messages, accountId } = await req.json();
        const oramaManager = new OramaManager(accountId)
        await oramaManager.initialize()

        const lastMessage = messages[messages.length - 1]

        const context = await oramaManager.vectorSearch({ prompt: lastMessage.content })
        console.log(context.hits.length + ' hits found')

        // Fallback: if Orama index is empty (e.g. built before API key was valid),
        // pull recent emails directly from the DB so the AI always has context.
        let emailContext = context.hits.map((hit) => JSON.stringify(hit.document)).join('\n')
        if (context.hits.length === 0) {
            const emails = await db.email.findMany({
                where: { thread: { accountId } },
                orderBy: { sentAt: 'desc' },
                take: 15,
                select: {
                    subject: true,
                    bodySnippet: true,
                    sentAt: true,
                    from: { select: { name: true, address: true } },
                    to: { select: { name: true, address: true } },
                    thread: { select: { id: true } },
                }
            })
            emailContext = emails.map(e =>
                `From: ${e.from?.name} <${e.from?.address}>\nTo: ${e.to.map(t => t.address).join(', ')}\nSubject: ${e.subject}\nSnippet: ${e.bodySnippet}\nSentAt: ${e.sentAt}`
            ).join('\n\n')
            console.log(`Orama empty — fell back to ${emails.length} emails from DB`)
        }

        const prompt = {
            role: "system",
            content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user with their emails by:
      1. Answering questions about emails in the provided context
      2. Summarising email threads when asked
      3. Drafting email replies or new emails when asked — format drafts like this:
         ---DRAFT---
         Subject: <subject>
         <email body>
         ---END DRAFT---

      THE TIME NOW IS ${new Date().toLocaleString()}

      START CONTEXT BLOCK
      ${emailContext}
      END OF CONTEXT BLOCK

      When responding:
      - Be helpful, concise, and articulate.
      - Rely on the provided email context to inform your responses.
      - If the context does not contain enough information, say so politely.
      - Do not invent details not supported by the email context.
      - When drafting emails, match the tone and style of the user's existing emails.`
        };


        const response = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                prompt,
                ...messages.filter((message: Message) => message.role === "user"),
            ],
            stream: true,
        });
        const stream = OpenAIStream(response, {
            onCompletion: async () => {
                await db.chatbotInteraction.upsert({
                    where: { userId },
                    create: { day: today, count: 1, userId },
                    update: { count: { increment: 1 } },
                })
            },
        });
        return new StreamingTextResponse(stream);
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "error" }, { status: 500 });
    }
}
