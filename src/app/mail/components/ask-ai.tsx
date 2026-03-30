'use client'
import { useChat } from 'ai/react'
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import React from 'react'
import { Send } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { cn } from '@/lib/utils';
import { SparklesIcon } from '@heroicons/react/24/solid';
import PremiumBanner from './premium-banner';
import { toast } from 'sonner';

function fakeInputEvent(value: string): React.ChangeEvent<HTMLInputElement> {
    return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

const transitionDebug = {
    type: "easeOut",
    duration: 0.2,
};

const AskAI = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const [accountId] = useLocalStorage('accountId', '')
    const { input, handleInputChange, handleSubmit, messages } = useChat({
        api: "/api/chat",
        body: { accountId },
        onError: (error) => {
            if (error.message.includes('Limit reached')) {
                toast.error('You have reached the limit for today. Please upgrade to pro to ask as many questions as you want')
            }
        },
        initialMessages: [],
    });

    React.useEffect(() => {
        const messageContainer = document.getElementById("message-container");
        if (messageContainer) {
            messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    if (isCollapsed) return null;
    return (
        <div className='p-4 h-full flex flex-col min-h-0'>
            {messages.length === 0 && (
                <>
                    <PremiumBanner />
                    <div className="h-4 flex-shrink-0" />
                </>
            )}
            <motion.div className="flex-1 min-h-0 flex flex-col border p-4 pb-3 rounded-lg bg-gray-100 shadow-inner dark:bg-gray-900 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto w-full" id='message-container'>
                    <div className="flex flex-col gap-2">
                        <AnimatePresence mode="wait">
                            {messages.map((message, idx) => (
                                <motion.div
                                    key={message.id}
                                    layout="position"
                                    className={cn("z-10 mt-2 max-w-[85%] break-words rounded-2xl bg-gray-200 dark:bg-gray-800", {
                                        'self-end text-gray-900 dark:text-gray-100 ml-auto': message.role === 'user',
                                        'self-start bg-blue-500 text-white': message.role === 'assistant',
                                    })}
                                    transition={transitionDebug}
                                >
                                    <div className="px-3 py-2 text-[14px] leading-[1.4]">
                                        {message.content}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    {messages.length === 0 && (
                        <div className="mb-3">
                            <div className='flex items-center gap-3'>
                                <SparklesIcon className='size-5 text-gray-500 flex-shrink-0' />
                                <div>
                                    <p className='text-gray-900 dark:text-gray-100 text-sm'>Ask AI anything about your emails</p>
                                    <p className='text-gray-500 text-xs dark:text-gray-400'>Or ask it to draft a reply</p>
                                </div>
                            </div>
                            <div className="h-2" />
                            <div className="flex items-center gap-2 flex-wrap">
                                <span onClick={() => handleInputChange(fakeInputEvent('What can I ask?'))}
                                    className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer'>What can I ask?</span>
                                <span onClick={() => handleInputChange(fakeInputEvent('When is my next flight?'))}
                                    className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer'>Next flight?</span>
                                <span onClick={() => handleInputChange(fakeInputEvent('Draft a reply to the latest email'))}
                                    className='px-2 py-1 bg-gray-800 text-gray-200 rounded-md text-xs cursor-pointer'>Draft a reply</span>
                            </div>
                        </div>
                    )}
                    {messages.length > 0 && <div className="h-2" />}
                    <form onSubmit={handleSubmit} className="flex w-full gap-2">
                        <input
                            type="text"
                            onChange={handleInputChange}
                            value={input}
                            className="h-9 flex-grow rounded-full border border-gray-200 bg-white px-3 text-[14px] outline-none placeholder:text-gray-400 placeholder:text-[13px]
                                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                            placeholder="Ask AI anything about your emails"
                        />
                        <button
                            type="submit"
                            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"
                        >
                            <Send className="size-4 text-gray-500 dark:text-gray-300" />
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default AskAI
