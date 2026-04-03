import { api } from '@/trpc/react'
import { getQueryKey } from '@trpc/react-query'
import React from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { toast } from 'sonner'
import { getAurinkoReconnectUrl } from '@/lib/aurinko'

const useThreads = () => {
    const { data: accounts } = api.mail.getAccounts.useQuery()
    const [accountId] = useLocalStorage('accountId', '')
    const [tab] = useLocalStorage('normalhuman-tab', 'inbox')
    const [done] = useLocalStorage('normalhuman-done', false)
    const queryKey = getQueryKey(api.mail.getThreads, { accountId, tab, done }, 'query')

    // FIX: Trigger a real incremental sync from Aurinko whenever accountId/tab changes.
    // Without this, the UI only re-reads from DB every 5s but never fetches NEW emails
    // from Aurinko — so the latest emails never appear after initial login.
    const showReconnectToast = React.useCallback(() => {
        toast.error('Email connection expired', {
            description: 'Your account token is no longer valid. Reconnect to resume syncing.',
            action: {
                label: 'Reconnect',
                onClick: async () => {
                    try {
                        const url = await getAurinkoReconnectUrl('Google')
                        window.location.href = url
                    } catch (e) {
                        toast.error((e as Error).message)
                    }
                }
            },
            duration: Infinity,
        })
    }, [])

    const { data: syncStatus } = api.mail.getSyncStatus.useQuery(
        { accountId },
        {
            enabled: !!accountId,
            refetchInterval: (query) => query.state.data?.isSynced ? false : 2000,
        }
    )

    const isSyncing = React.useRef(false)

    const { mutate: syncEmails } = api.mail.syncEmails.useMutation({
        onError: (error) => {
            isSyncing.current = false
            if (error.data?.code === 'UNAUTHORIZED') {
                showReconnectToast()
            }
        }
    })

    React.useEffect(() => {
        if (!accountId || isSyncing.current) return
        isSyncing.current = true
        syncEmails({ accountId }, {
            onSuccess: () => {
                isSyncing.current = false
                void refetch()
            }
        })
    }, [accountId])

    const { data: threads, isFetching, refetch } = api.mail.getThreads.useQuery({
        accountId,
        done,
        tab
    }, {
        enabled: !!accountId && !!tab,
        placeholderData: (e) => e,
        // FIX: Reduced from 5s to 30s — the 5s poll only re-reads the DB, which is
        // fine for thread status updates (done/read), but actual new email fetching
        // is now driven by syncEmails above, not this poll.
        refetchInterval: 1000 * 60
    })

    // Manual refresh: re-syncs from Aurinko then immediately refetches threads
    const syncAndRefetch = React.useCallback(() => {
        if (!accountId || isSyncing.current) return
        isSyncing.current = true
        syncEmails({ accountId }, {
            onSuccess: () => {
                isSyncing.current = false
                void refetch()
            }
        })
    }, [accountId, syncEmails, refetch])

    return {
        threads,
        isFetching,
        isSynced: syncStatus?.isSynced ?? false,
        account: accounts?.find((account) => account.id === accountId),
        refetch: syncAndRefetch,
        accounts,
        queryKey,
        accountId
    }
}

export default useThreads