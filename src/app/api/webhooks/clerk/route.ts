import { db } from "@/server/db";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
    try {
        const payload = await req.json();
        const data = payload.data;

        if (!data) {
            return new Response('No data in payload', { status: 400 });
        }

        const emailAddress = data.email_addresses?.[0]?.email_address;
        const firstName = data.first_name ?? '';
        const lastName = data.last_name ?? '';
        const imageUrl = data.image_url ?? '';
        const id = data.id;

        if (!id || !emailAddress) {
            return new Response('Missing required fields', { status: 400 });
        }

        await db.user.upsert({
            where: { id },
            update: { emailAddress, firstName, lastName, imageUrl },
            create: { id, emailAddress, firstName, lastName, imageUrl },
        });

        console.log('✅ User upserted:', id, emailAddress);
        return new Response('Webhook received', { status: 200 });

    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}