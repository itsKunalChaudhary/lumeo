"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { Plus, X } from "lucide-react"
import { getAurinkoAuthorizationUrl } from "@/lib/aurinko"
import { toast } from "sonner"

interface AccountSwitcherProps {
  isCollapsed: boolean
}

export function AccountSwitcher({
  isCollapsed
}: AccountSwitcherProps) {
  const { data: accounts, refetch } = api.mail.getAccounts.useQuery()
  const [accountId, setAccountId] = useLocalStorage('accountId', '')
  const utils = api.useUtils()

  const deleteAccount = api.mail.deleteAccount.useMutation({
    onSuccess: async () => {
      await refetch()
      const remaining = (await utils.mail.getAccounts.fetch())
      if (remaining.length > 0) {
        setAccountId(remaining[0]!.id)
      } else {
        setAccountId('')
        toast('No accounts linked', {
          action: {
            label: 'Add account',
            onClick: async () => {
              try {
                const url = await getAurinkoAuthorizationUrl('Google')
                window.location.href = url
              } catch (error) {
                toast.error((error as Error).message)
              }
            }
          }
        })
      }
    },
    onError: () => toast.error('Failed to remove account')
  })

  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      const isValid = accounts.some((a) => a.id === accountId)
      if (!isValid) setAccountId(accounts[0]!.id)
    } else if (accounts && accounts.length === 0) {
      toast('Link an account to continue', {
        action: {
          label: 'Add account',
          onClick: async () => {
            try {
              const url = await getAurinkoAuthorizationUrl('Google')
              window.location.href = url
            } catch (error) {
              toast.error((error as Error).message)
            }
          }
        },
      })
    }
  }, [accounts])

  if (!accounts) return <></>
  return (
    <div className="items-center gap-2 flex w-full">
      <Select defaultValue={accountId} onValueChange={setAccountId}>
        <SelectTrigger
          className={cn(
            "flex w-full flex-1 items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
            isCollapsed &&
            "flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden"
          )}
          aria-label="Select account"
        >
          <SelectValue placeholder="Select an account">
            <span className={cn({ "hidden": !isCollapsed })}>
              {accounts.find((account) => account.id === accountId)?.emailAddress[0]}
            </span>
            <span className={cn("ml-2", isCollapsed && "hidden")}>
              {accounts.find((account) => account.id === accountId)?.emailAddress}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-3 w-full [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-foreground">
                <span className="flex-1">{account.emailAddress}</span>
                <span
                  role="button"
                  className="ml-auto rounded p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteAccount.mutate({ accountId: account.id })
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </div>
            </SelectItem>
          ))}
          <div
            onClick={async () => {
              try {
                const url = await getAurinkoAuthorizationUrl('Google')
                window.location.href = url
              } catch (error) {
                toast.error((error as Error).message)
              }
            }}
            className="relative flex hover:bg-gray-50 dark:hover:bg-gray-800 w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none"
          >
            <Plus className="size-4 mr-1" />
            Add account
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}
