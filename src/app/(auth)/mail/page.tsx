

const MailPage = dynamic(() => import("@/app/mail/index"), {
  loading: () => <div>Loading...</div>,
  ssr: false,
})
import { ModeToggle } from "@/components/theme-toggle"
import { UserButton } from "@clerk/nextjs"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import ComposeButton from "@/app/mail/components/compose-button"
import WebhookDebugger from "@/app/mail/components/webhook-debugger"
import TopAccountSwitcher from "./top-account-switcher"
export default function Home() {
  return <MailPage />
}
