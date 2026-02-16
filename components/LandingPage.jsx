"use client"

import { MessageSquarePlus, Clock, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { timeAgo } from "./utils"

export default function LandingPage({ recents = [], onSelect, onNewChat }) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-950">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full space-y-8"
            >
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
                        Welcome back
                    </h1>
                    <p className="text-lg text-zinc-500 dark:text-zinc-400">
                        Ready to start a new conversation or continue where you left off?
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <button
                        onClick={onNewChat}
                        className="group relative flex h-40 flex-col items-start justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
                    >
                        <div className="rounded-full bg-blue-500/10 p-3 text-blue-500 dark:bg-blue-500/20">
                            <MessageSquarePlus className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                New Chat
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors">
                                Start a fresh conversation &rarr;
                            </div>
                        </div>
                    </button>

                    <div className="flex h-40 flex-col rounded-2xl border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            <Clock className="h-4 w-4" />
                            <span>Recent Activity</span>
                        </div>

                        {recents.length > 0 ? (
                            <div className="flex-1 space-y-2 overflow-hidden">
                                {recents.slice(0, 3).map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => onSelect(chat.id)}
                                        className="flex w-full items-center justify-between rounded-lg p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <span className="truncate font-medium text-zinc-700 dark:text-zinc-300 max-w-[80%]">
                                            {chat.title || "Untitled Chat"}
                                        </span>
                                        <span className="text-xs text-zinc-400 flex-shrink-0">
                                            {timeAgo(chat.updatedAt)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400 italic">
                                No recent chats
                            </div>
                        )}

                        {recents.length > 3 && (
                            <div className="mt-auto pt-2 text-xs text-center text-zinc-400">
                                +{recents.length - 3} more in sidebar
                            </div>
                        )}
                    </div>
                </div>

                {recents.length > 0 && (
                    <div className="pt-8">
                        <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Continue working
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {recents.slice(0, 3).map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => onSelect(chat.id)}
                                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                >
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                        <MessageSquarePlus className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {chat.title}
                                        </div>
                                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {timeAgo(chat.updatedAt)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </motion.div>
        </div>
    )
}
