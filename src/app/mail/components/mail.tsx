"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { AccountSwitcher } from "@/app/mail/components/account-switcher"
import { ThreadDisplay } from "./thread-display"
import { ThreadList } from "./thread-list"
import { useLocalStorage } from "usehooks-ts"
import SideBar from "./sidebar"
import SearchBar from "./search-bar"
import AskAI from "./ask-ai"
import { UserButton } from "@clerk/nextjs"
import { ModeToggle } from "@/components/theme-toggle"
import ComposeButton from "./compose-button"
import WebhookDebugger from "./webhook-debugger"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useThread } from "@/app/mail/use-thread"

interface MailProps {
  defaultLayout: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize?: number
}

export function Mail({
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
}: MailProps) {
  const [done, setDone] = useLocalStorage('normalhuman-done', false)
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [threadId] = useThread()

  // Derive thread-list / email-display split from stored layout (indices 1 & 2)
  const tl = defaultLayout[1] ?? 32
  const ed = defaultLayout[2] ?? 48
  const threadListDefault = Math.round((tl / (tl + ed)) * 100)
  const emailDisplayDefault = 100 - threadListDefault

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full min-h-screen">

        {/* ── Fixed-width sidebar (not resizable) ── */}
        <div className={cn(
          "flex-shrink-0 flex flex-col border-r transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-[50px]" : "w-1/3"
        )}>
          <div className={cn(
            "flex h-[52px] items-center justify-center",
            isCollapsed ? "h-[52px]" : "px-2"
          )}>
            <AccountSwitcher isCollapsed={isCollapsed} />
          </div>
          <Separator />
          <SideBar isCollapsed={isCollapsed} />
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0" />
            <AskAI isCollapsed={isCollapsed} />
          </div>
          <Separator />
          <div className={cn(
            "p-2 flex items-center gap-1",
            isCollapsed ? "flex-col justify-evenly" : "flex-row flex-wrap justify-evenly"
          )}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><UserButton /></div>
              </TooltipTrigger>
              <TooltipContent side="right">Account</TooltipContent>
            </Tooltip>
            <ModeToggle />
            <ComposeButton isCollapsed={true} />
            {process.env.NODE_ENV === 'development' && <WebhookDebugger />}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(c => !c)} className="h-8 w-8">
                  {isCollapsed
                    ? <PanelLeftOpen className="h-4 w-4" />
                    : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? 'Expand sidebar' : 'Hide sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Thread list + email display (resizable between each other) ── */}
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={(sizes: number[]) => {
            document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(sizes)}`
          }}
          className="flex-1 h-full"
        >
          <ResizablePanel
            id="threadlist"
            order={1}
            defaultSize={threadListDefault}
            minSize={20}
            className="h-full overflow-hidden"
          >
            <Tabs defaultValue="inbox" value={done ? 'done' : 'inbox'} onValueChange={tab => {
              setDone(tab === 'done')
            }} className="h-full flex flex-col">
              <div className="flex items-center px-4 py-2 flex-shrink-0">
                <h1 className="text-xl font-bold">Inbox</h1>
                <TabsList className="ml-auto">
                  <TabsTrigger value="inbox" className="text-zinc-600 dark:text-zinc-200">
                    Inbox
                  </TabsTrigger>
                  <TabsTrigger value="done" className="text-zinc-600 dark:text-zinc-200">
                    Archived
                  </TabsTrigger>
                </TabsList>
              </div>
              <Separator />
              <SearchBar />
              <TabsContent value="inbox" className="flex-1 overflow-y-auto m-0">
                <ThreadList />
              </TabsContent>
              <TabsContent value="done" className="flex-1 overflow-y-auto m-0">
                <ThreadList />
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          {!!threadId && <ResizableHandle withHandle />}
          {!!threadId && (
            <ResizablePanel
              id="emaildisplay"
              order={2}
              defaultSize={emailDisplayDefault}
              minSize={25}
            >
              <ThreadDisplay />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>

      </div>
    </TooltipProvider>
  )
}
