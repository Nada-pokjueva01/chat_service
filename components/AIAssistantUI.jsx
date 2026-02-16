"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, LayoutGrid, MoreHorizontal } from "lucide-react"
import { useChat } from "@ai-sdk/react" // AI SDK 도입
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import GhostIconButton from "./GhostIconButton"
import ThemeToggle from "./ThemeToggle"
import { INITIAL_TEMPLATES, INITIAL_FOLDERS } from "./mockData"
import LandingPage from "./LandingPage"

export default function AIAssistantUI() {
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("theme")
    if (saved) return saved
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark"
    return "light"
  })

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    try {
      if (theme === "dark") document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      // ... existing theme logic
      document.documentElement.setAttribute("data-theme", theme)
      document.documentElement.style.colorScheme = theme
      localStorage.setItem("theme", theme)
    } catch { }
  }, [theme])

  useEffect(() => {
    try {
      const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")
      if (!media) return
      const listener = (e) => {
        const saved = localStorage.getItem("theme")
        if (!saved) setTheme(e.matches ? "dark" : "light")
      }
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    } catch { }
  }, [])



  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      return raw ? JSON.parse(raw) : { pinned: true, recent: false, folders: true, templates: true }
    } catch {
      return { pinned: true, recent: false, folders: true, templates: true }
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed))
    } catch { }
  }, [collapsed])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state")
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed-state", JSON.stringify(sidebarCollapsed))
    } catch { }
  }, [sidebarCollapsed])

  const [input, setInput] = useState('')
  const handleInputChange = (e) => {
    setInput(e.target.value)
  }



  // 🚀 Refactor: DB as Single Source of Truth
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES)
  const [folders, setFolders] = useState(INITIAL_FOLDERS)



  const [query, setQuery] = useState("")
  const searchRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen, conversations])

  // Landing page: no auto-create on mount

  useEffect(() => {
    loadConversations()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
  }, [conversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const recent = filtered
    .filter((c) => !c.pinned)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10)

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]))
    for (const c of conversations) if (map[c.folder] != null) map[c.folder] += 1
    return map
  }, [conversations, folders])

  function togglePin(id) {
    const conv = conversations.find(c => c.id === id);
    const newPinned = !conv?.pinned;

    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: newPinned } : c)));

    fetch('/api/chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, pinned: newPinned }),
    }).catch(err => console.error('[UI] Failed to save pinned status:', err));
  }

  function renameChat(id, newTitle) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));

    fetch('/api/chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, title: newTitle }),
    }).catch(err => console.error('[UI] Failed to save title:', err));
  }

  async function deleteConversation(id) {
    try {
      await fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('[UI] Failed to delete messages from DB:', err);
    }

    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);

      if (selectedId === id) {
        if (updated.length > 0) {
          // If current chat is deleted, go to Landing Page (null) or select next?
          // User request implies Landing Page preference.
          setSelectedId(null);
        } else {
          // No chats left
          setSelectedId(null);
        }
      }
      return updated;
    });
  }


  async function loadConversations() {
    try {
      const res = await fetch('/api/chat?all=true');
      const data = await res.json();
      const dbConversations = data.conversations || [];
      // Sort: Newest first
      dbConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setConversations(dbConversations);
    } catch (err) {
      console.error('[UI] Failed to load conversations:', err);
    }
  }



  function createNewChat() {
    // Use same format as DB: conv_[timestamp]_[random]
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const item = {
      id,
      title: "New Chat",
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      preview: "Say hello to start...",
      pinned: false,
      folder: "Work Projects",
      messages: [], // Ensure messages array is empty for new chats
    }
    setConversations((prev) => [item, ...prev])
    setSelectedId(id)
    setSidebarOpen(false)
  }

  function createFolder() {
    const name = prompt("Folder name")
    if (!name) return
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert("Folder already exists.")
    setFolders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name }])
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const {
    messages: chatMessages,
    isLoading,
    error,
    stop,
    sendMessage,
    setMessages,
  } = useChat({
    id: selectedId || "__landing__",
    api: "/api/chat",
    body: { conversationId: selectedId },
    initialMessages: selectedConversation?.messages || [],
    onFinish: ({ message }) => {
      // 1. Extract content from the AI response
      const textPart = message.parts?.find(p => p.type === 'text')
      const contentText = textPart ? textPart.text : ""
      const previewText = contentText ? contentText.slice(0, 80) : "No content."

      // 2. Sync ONLY metadata into the conversations list (Optimistic UI)
      setConversations(prev => prev.map(c =>
        c.id === selectedId ? {
          ...c,
          preview: previewText,
          updatedAt: new Date().toISOString(),
          // Incremented by 2 (User message + AI response)
          messageCount: (c.messageCount || 0) + 2,
        } : c
      ))
    },
    onError: (error) => {
      console.error('[useChat] Error:', error);
    }
  })

  useEffect(() => {
    if (!selectedId) return;

    async function loadMessages() {
      if (!selectedId) return;
      try {
        const res = await fetch(`/api/chat?conversationId=${selectedId}`);
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          const msgs = data.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
          }));

          setConversations(prev => prev.map(c =>
            c.id === selectedId ? { ...c, messages: msgs } : c
          ));
          setMessages(msgs);
        }
      } catch (err) {
        console.error('[UI] Failed to load messages:', err);
      }
    }

    loadMessages();
  }, [selectedId]);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput) return;

    // 1. Optimistic Update (Immediate Feedback)
    setConversations(prev => prev.map(c =>
      c.id === selectedId ? {
        ...c,
        preview: currentInput.slice(0, 80),
        updatedAt: new Date().toISOString(),
      } : c
    ))

    // 2. Snappy UI: Clear input immediately
    setInput('');

    // 3. Trigger SDK to send message
    // AI SDK v6 uses sendMessage({ text }, options)
    await sendMessage({
      text: currentInput,
    }, {
      body: { conversationId: selectedId }
    });
  };

  async function editMessage(convId, messageId, newContent) {
    // 1. Optimistic Update (Local UI)
    const now = new Date().toISOString()
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = (c.messages || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, editedAt: now } : m,
        )
        return {
          ...c,
          messages: msgs,
          preview: msgs[msgs.length - 1]?.content?.slice(0, 80) || c.preview,
        }
      }),
    )

    // 2. Persist to DB
    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content: newContent })
      });
    } catch (err) {
      console.error('[UI] Failed to update message in DB:', err);
    }

    // 3. Update SDK State (if currently selected)
    if (convId === selectedId) {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, parts: [{ type: 'text', text: newContent }] } : m
      ));
    }
  }

  function resendMessage(convId, messageId) {
    // 1. Try finding in current SDK messages first (most up to date for selected chat)
    let msg = chatMessages?.find(m => m.id === messageId);

    // 2. Fallback to conversations list
    if (!msg) {
      const conv = conversations.find((c) => c.id === convId);
      msg = conv?.messages?.find((m) => m.id === messageId);
    }

    if (!msg || (!msg.content && (!msg.parts || msg.parts.length === 0))) return;

    const content = msg.content || msg.parts?.find(p => p.type === 'text')?.text || "";
    if (!content) return;

    sendMessage({ text: content });
  }

  function pauseThinking() {
    if (stop) {
      stop();
    }
  }

  function handleUseTemplate(template) {
    if (composerRef.current) {
      composerRef.current.insertTemplate(template.content)
    }
  }

  const composerRef = useRef(null)
  const selected = conversations.find((c) => c.id === selectedId) || null

  if (!isMounted) return null

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> AI Assistant
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="Schedule">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="Apps">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="mx-auto flex h-[calc(100vh-0px)] max-w-[1400px]">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          conversations={conversations}
          pinned={pinned}
          recent={recent}
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          onRename={renameChat}
          onDelete={deleteConversation}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header createNewChat={createNewChat} sidebarCollapsed={sidebarCollapsed} setSidebarOpen={setSidebarOpen} />
          {selected ? (
            <ChatPane
              ref={composerRef}
              conversation={selected}
              messages={chatMessages}
              input={input}

              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}

              sendMessage={sendMessage}
              onEditMessage={(messageId, newContent) => selected && editMessage(selected.id, messageId, newContent)}
              onResendMessage={(messageId) => selected && resendMessage(selected.id, messageId)}
              isThinking={isLoading}
              onPauseThinking={pauseThinking}
            />
          ) : (
            <LandingPage
              recents={recent}
              onSelect={setSelectedId}
              onNewChat={createNewChat}
            />
          )}
        </main>
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 max-w-md">
          <div className="font-semibold">Chat Error</div>
          <div className="text-sm">{error.message}</div>
        </div>
      )}
    </div>
  )
}