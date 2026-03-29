import type { EmailHeader, EmailMessage, SyncResponse, SyncUpdatedResponse } from '@/lib/types';
import { db } from '@/server/db';
import axios from 'axios';
import { syncEmailsToDatabase } from './sync-to-db';

const API_BASE_URL = 'https://api.aurinko.io/v1';

class Account {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async startSync(daysWithin: number): Promise<SyncResponse> {
        const response = await axios.post<SyncResponse>(
            `${API_BASE_URL}/email/sync`,
            {},
            {
                headers: { Authorization: `Bearer ${this.token}` },
                params: {
                    daysWithin,
                    bodyType: 'html'
                }
            }
        );
        return response.data;
    }

    async createSubscription() {
        const webhookUrl = process.env.NEXT_PUBLIC_URL
        const res = await axios.post('https://api.aurinko.io/v1/subscriptions',
            {
                resource: '/email/messages',
                notificationUrl: webhookUrl + '/api/aurinko/webhook'
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        return res.data
    }

    async syncEmails() {
        const account = await db.account.findUnique({
            where: { token: this.token },
        })
        if (!account) throw new Error("Invalid token")
        if (!account.nextDeltaToken) throw new Error("No delta token")

        let allEmails: EmailMessage[] = []
        let storedDeltaToken = account.nextDeltaToken

        // FIX: Use a loop-based approach that reliably captures the final deltaToken
        let response = await this.getUpdatedEmails({ deltaToken: account.nextDeltaToken })
        allEmails = allEmails.concat(response.records)

        // Capture deltaToken whenever it appears — it only appears on the LAST page
        if (response.nextDeltaToken) {
            storedDeltaToken = response.nextDeltaToken
        }

        // Paginate through all remaining pages
        while (response.nextPageToken) {
            response = await this.getUpdatedEmails({ pageToken: response.nextPageToken })
            allEmails = allEmails.concat(response.records)
            // nextDeltaToken appears on the final page — capture it every time we see it
            if (response.nextDeltaToken) {
                storedDeltaToken = response.nextDeltaToken
            }
        }

        console.log(`syncEmails: fetched ${allEmails.length} updated emails`)

        try {
            await syncEmailsToDatabase(allEmails, account.id)
        } catch (error) {
            console.log('syncEmails: error writing to DB', error)
        }

        // Always persist the latest delta token so next sync is incremental
        await db.account.update({
            where: { id: account.id },
            data: { nextDeltaToken: storedDeltaToken }
        })
    }

    async getUpdatedEmails({ deltaToken, pageToken }: { deltaToken?: string, pageToken?: string }): Promise<SyncUpdatedResponse> {
        const params: Record<string, string> = {};
        if (deltaToken) params.deltaToken = deltaToken;
        if (pageToken) params.pageToken = pageToken;

        const response = await axios.get<SyncUpdatedResponse>(
            `${API_BASE_URL}/email/sync/updated`,
            {
                params,
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        return response.data;
    }

    async performInitialSync() {
        try {
            // FIX: was 3 days — far too small. 365 days syncs a full year of inbox history.
            // Increase further (e.g. 730) if you want 2 years of history.
            const daysWithin = 365

            let syncResponse = await this.startSync(daysWithin);

            // Poll until Aurinko confirms sync is ready
            while (!syncResponse.ready) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                syncResponse = await this.startSync(daysWithin);
            }

            console.log(`performInitialSync: sync ready, fetching emails for last ${daysWithin} days`)

            let storedDeltaToken: string = syncResponse.syncUpdatedToken
            let updatedResponse = await this.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
            let allEmails: EmailMessage[] = updatedResponse.records;

            if (updatedResponse.nextDeltaToken) {
                storedDeltaToken = updatedResponse.nextDeltaToken
            }

            // FIX: Paginate through ALL pages — original code was correct here but
            // we make delta token capture more explicit
            while (updatedResponse.nextPageToken) {
                updatedResponse = await this.getUpdatedEmails({ pageToken: updatedResponse.nextPageToken });
                allEmails = allEmails.concat(updatedResponse.records);
                if (updatedResponse.nextDeltaToken) {
                    storedDeltaToken = updatedResponse.nextDeltaToken
                }
            }

            console.log(`performInitialSync: fetched ${allEmails.length} emails total`)

            return {
                emails: allEmails,
                deltaToken: storedDeltaToken,
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error during initial sync:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error during initial sync:', error);
            }
        }
    }

    async sendEmail({
        from,
        subject,
        body,
        inReplyTo,
        references,
        threadId,
        to,
        cc,
        bcc,
        replyTo,
    }: {
        from: EmailAddress;
        subject: string;
        body: string;
        inReplyTo?: string;
        references?: string;
        threadId?: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        replyTo?: EmailAddress;
    }) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/email/messages`,
                {
                    from,
                    subject,
                    body,
                    inReplyTo,
                    references,
                    threadId,
                    to,
                    cc,
                    bcc,
                    replyTo: [replyTo],
                },
                {
                    params: { returnIds: true },
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );
            console.log('sendmail', response.data)
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error sending email:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error sending email:', error);
            }
            throw error;
        }
    }

    async saveDraft({
        from,
        subject,
        body,
        to,
        cc,
        bcc,
        replyTo,
    }: {
        from: EmailAddress;
        subject: string;
        body: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        replyTo?: EmailAddress;
    }) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/email/messages`,
                {
                    from,
                    subject,
                    body,
                    to,
                    cc,
                    bcc,
                    replyTo: replyTo ? [replyTo] : undefined,
                    draft: true,
                },
                {
                    params: { returnIds: true },
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error saving draft:', JSON.stringify(error.response?.data, null, 2));
            }
            throw error;
        }
    }

    async getWebhooks() {
        type Response = {
            records: {
                id: number;
                resource: string;
                notificationUrl: string;
                active: boolean;
                failSince: string;
                failDescription: string;
            }[];
            totalSize: number;
            offset: number;
            done: boolean;
        }
        const res = await axios.get<Response>(`${API_BASE_URL}/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async createWebhook(resource: string, notificationUrl: string) {
        const res = await axios.post(`${API_BASE_URL}/subscriptions`, {
            resource,
            notificationUrl
        }, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async deleteWebhook(subscriptionId: string) {
        const res = await axios.delete(`${API_BASE_URL}/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }
}

type EmailAddress = {
    name: string;
    address: string;
}

export default Account;