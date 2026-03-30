import React from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-toggle"
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

const features = [
  {
    title: "AI Email Intelligence",
    description: "Ask questions about your inbox in plain English. Lumeo's RAG engine searches across all your emails and surfaces exactly what you need.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="5" stroke="url(#g1)" strokeWidth="1.5"/>
        <circle cx="8" cy="10" r="3" stroke="url(#g1)" strokeWidth="1.5"/>
        <circle cx="32" cy="10" r="3" stroke="url(#g1)" strokeWidth="1.5"/>
        <circle cx="8" cy="30" r="3" stroke="url(#g1)" strokeWidth="1.5"/>
        <circle cx="32" cy="30" r="3" stroke="url(#g1)" strokeWidth="1.5"/>
        <line x1="11" y1="11.5" x2="17" y2="17" stroke="url(#g1)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="29" y1="11.5" x2="23" y2="17" stroke="url(#g1)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="11" y1="28.5" x2="17" y2="23" stroke="url(#g1)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="29" y1="28.5" x2="23" y2="23" stroke="url(#g1)" strokeWidth="1.2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa"/>
            <stop offset="1" stopColor="#a78bfa"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-blue-500/10 to-violet-500/10",
    border: "hover:border-blue-500/40",
  },
  {
    title: "Semantic Search",
    description: "Find any email instantly with vector-powered full-text search. No more digging through folders — just type what you remember.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="10" stroke="url(#g2)" strokeWidth="1.5"/>
        <line x1="25.5" y1="25.5" x2="34" y2="34" stroke="url(#g2)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="14" y1="18" x2="22" y2="18" stroke="url(#g2)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="18" y1="14" x2="18" y2="22" stroke="url(#g2)" strokeWidth="1.2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399"/>
            <stop offset="1" stopColor="#60a5fa"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-emerald-500/10 to-blue-500/10",
    border: "hover:border-emerald-500/40",
  },
  {
    title: "AI Compose & Reply",
    description: "Generate polished email drafts with one click. Lumeo reads your thread context and writes replies that match your tone.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="22" height="28" rx="3" stroke="url(#g3)" strokeWidth="1.5"/>
        <line x1="11" y1="15" x2="23" y2="15" stroke="url(#g3)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="11" y1="20" x2="23" y2="20" stroke="url(#g3)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="11" y1="25" x2="18" y2="25" stroke="url(#g3)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M28 6 L34 12 L22 24 L16 26 L18 20 Z" stroke="url(#g3)" strokeWidth="1.3" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="g3" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f472b6"/>
            <stop offset="1" stopColor="#a78bfa"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-pink-500/10 to-violet-500/10",
    border: "hover:border-pink-500/40",
  },
  {
    title: "Keyboard-first UX",
    description: "Every action has a shortcut. Navigate threads, compose, search, and archive without ever leaving your keyboard.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="10" width="32" height="22" rx="3" stroke="url(#g4)" strokeWidth="1.5"/>
        <rect x="8" y="15" width="5" height="4" rx="1" stroke="url(#g4)" strokeWidth="1.1"/>
        <rect x="16" y="15" width="5" height="4" rx="1" stroke="url(#g4)" strokeWidth="1.1"/>
        <rect x="24" y="15" width="5" height="4" rx="1" stroke="url(#g4)" strokeWidth="1.1"/>
        <rect x="10" y="23" width="17" height="4" rx="1" stroke="url(#g4)" strokeWidth="1.1"/>
        <defs>
          <linearGradient id="g4" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb923c"/>
            <stop offset="1" stopColor="#f59e0b"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-orange-500/10 to-amber-500/10",
    border: "hover:border-orange-500/40",
  },
  {
    title: "Real-time Sync",
    description: "Your inbox stays live. New emails arrive instantly via webhook-powered sync — no refreshing required.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 20 A12 12 0 0 1 32 14" stroke="url(#g5)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M32 20 A12 12 0 0 1 8 26" stroke="url(#g5)" strokeWidth="1.5" strokeLinecap="round"/>
        <polyline points="29,8 32,14 26,14" stroke="url(#g5)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        <polyline points="11,32 8,26 14,26" stroke="url(#g5)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        <defs>
          <linearGradient id="g5" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee"/>
            <stop offset="1" stopColor="#60a5fa"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-cyan-500/10 to-blue-500/10",
    border: "hover:border-cyan-500/40",
  },
  {
    title: "Smart Archiving",
    description: "Keep your inbox zero effortlessly. Archive, unarchive, and organise threads with smart labels and one-click actions.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="28" height="6" rx="2" stroke="url(#g6)" strokeWidth="1.5"/>
        <path d="M8 14 L8 32 Q8 34 10 34 L30 34 Q32 34 32 32 L32 14" stroke="url(#g6)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M16 22 L20 26 L24 22" stroke="url(#g6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="20" y1="18" x2="20" y2="26" stroke="url(#g6)" strokeWidth="1.4" strokeLinecap="round"/>
        <defs>
          <linearGradient id="g6" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa"/>
            <stop offset="1" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "from-violet-500/10 to-pink-500/10",
    border: "hover:border-violet-500/40",
  },
]

const LandingPage = async () => {
  const { userId } = auth()
  if (userId) {
    return redirect('/mail')
  }
  return (
    <>
      {/* Grid background */}
      <div className="absolute z-[-1] bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_80%)]" />

      <div className="min-h-screen flex flex-col items-center relative z-[10]">

        {/* ── Navbar ── */}
        <nav className="w-full flex items-center justify-between px-8 py-4 border-b border-zinc-800/60 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Lumeo logo" width={28} height={28} className="rounded-md" />
            <span className="text-white font-bold text-lg tracking-tight">Lumeo</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
            <ModeToggle />
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="flex flex-col items-center pt-32 pb-16 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/60 text-xs text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-powered · Real-time sync · Privacy first
          </div>
          <h1 className="bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 font-bold text-6xl md:text-7xl inline-block text-transparent bg-clip-text leading-tight max-w-4xl">
            The minimalistic,<br />AI-powered email client.
          </h1>
          <div className="h-6" />
          <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
            Lumeo is a minimalistic, AI-powered email client that empowers you to manage your email with ease.
          </p>
          <div className="h-8" />
          <div className="flex items-center gap-3">
            <Link href="/mail">
              <Button size="lg" className="px-8">Get Started</Button>
            </Link>
            <Link href="https://start-saas.com?utm=Lumeo" target="_blank">
              <Button variant="outline" size="lg">Learn More</Button>
            </Link>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="w-full max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Experience the power of</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Everything you need to reach inbox zero — and stay there. Built for people who take their email seriously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`group relative p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 ${feature.border}`}
              >
                {/* Icon */}
                <div className="mb-5 w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-800/60 group-hover:bg-zinc-800 transition-colors">
                  {feature.icon}
                </div>
                {/* Text */}
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo screenshot ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-8">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/60">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
            <Image
              src="/demo.png"
              alt="Lumeo app screenshot"
              width={1200}
              height={800}
              className="w-full h-auto transition-transform duration-700 hover:scale-[101%]"
            />
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="w-full border-t border-zinc-800/60 mt-16 py-8 px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} Lumeo. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="hover:text-zinc-300 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-zinc-300 transition-colors">Sign Up</Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-zinc-300 transition-colors">Terms</Link>
          </div>
        </footer>

      </div>
    </>
  )
}

export default LandingPage
