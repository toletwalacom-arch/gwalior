import { ChangeEvent, FormEvent, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ConversationMessage,
  ConversationSummary,
  FollowListMember,
  createConversation,
  deleteConversationMessage,
  editConversationMessage,
  getConversationMessages,
  getMyConversations,
  getProfileFollowList,
  getCurrentUser,
  markConversationRead,
  sendConversationMessage,
  setConversationTyping,
  supabase,
  uploadChatImage,
} from "./lib/supabase"

const EmojiPicker = lazy(() => import("emoji-picker-react"))

function navigate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function getGifLink(body: string) {
  const url = body.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[),.!?]+$/, "")
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" || !/(^|\.)((tenor\.com)|(giphy\.com))$/i.test(parsed.hostname)) return null
    return url
  } catch {
    return null
  }
}

function isDirectGifUrl(url: string) {
  try {
    const parsed = new URL(url)
    return /(^|\.)media\.tenor\.com$/i.test(parsed.hostname)
      || /(^|\.)media\.giphy\.com$/i.test(parsed.hostname)
      || /(^|\.)i\.giphy\.com$/i.test(parsed.hostname)
  } catch {
    return false
  }
}

function Avatar({ name, image, size = "h-11 w-11" }: { name: string; image?: string | null; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-xs font-extrabold text-blue-700`}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : initials(name || "?")}
    </span>
  )
}

function formatTime(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const now = new Date()
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function getConversationName(conversation: ConversationSummary, userId: string) {
  if (conversation.conversation_type === "group") return conversation.title || "Group conversation"
  const other = conversation.participants.find((participant) => participant.id !== userId)
  return other?.full_name || "Conversation"
}

function getConversationAvatar(conversation: ConversationSummary, userId: string) {
  if (conversation.conversation_type === "group") return null
  return conversation.participants.find((participant) => participant.id !== userId)?.avatar_url
}

function readCachedConversations(userId: string) {
  try {
    const cached = sessionStorage.getItem(`gwaliorwale-messages:${userId}`)
    if (!cached) return null
    const parsed: unknown = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed as ConversationSummary[] : null
  } catch {
    return null
  }
}

function cacheConversations(userId: string, conversations: ConversationSummary[]) {
  try {
    sessionStorage.setItem(`gwaliorwale-messages:${userId}`, JSON.stringify(conversations))
  } catch {
    // Keep messaging usable when browser storage is unavailable or full.
  }
}

function readCachedMessages(userId: string, conversationId: string) {
  try {
    const cached = sessionStorage.getItem(`gwaliorwale-messages:${userId}:${conversationId}`)
    if (!cached) return null
    const parsed: unknown = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed as ConversationMessage[] : null
  } catch {
    return null
  }
}

function cacheMessages(userId: string, conversationId: string, messages: ConversationMessage[]) {
  try {
    sessionStorage.setItem(`gwaliorwale-messages:${userId}:${conversationId}`, JSON.stringify(messages))
  } catch {
    // Keep messaging usable when browser storage is unavailable or full.
  }
}

function mergeMessages(current: ConversationMessage[], incoming: ConversationMessage[]) {
  const messagesById = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) messagesById.set(message.id, message)
  return [...messagesById.values()].sort((first, second) =>
    first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id),
  )
}

function NewConversationDialog({
  userId,
  onClose,
  onCreated,
}: {
  userId: string
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [people, setPeople] = useState<FollowListMember[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getProfileFollowList(userId, "followers")
      .then((members) => { if (active) setPeople(members) })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load your followers.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return people.filter((person) =>
      !needle || `${person.full_name} ${person.username}`.toLowerCase().includes(needle),
    )
  }, [people, query])

  const togglePerson = (id: string) => {
    setSelected((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id])
  }

  const create = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setError("")
    try {
      const id = await createConversation(selected, selected.length > 1 ? title : undefined)
      onCreated(id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start this conversation.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="new-conversation-title" className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">Direct messages</p>
            <h2 id="new-conversation-title" className="mt-1 text-xl font-extrabold">Start a conversation</h2>
            <p className="mt-1 text-xs text-slate-500">Choose from people who already follow you.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl text-xl text-slate-400 hover:bg-slate-100">×</button>
        </div>
        <div className="p-5 sm:px-6">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search followers" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
          {selected.length > 1 && (
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Group name (optional)" className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
          )}
        </div>
        <div className="min-h-24 flex-1 overflow-y-auto px-5 pb-3 sm:px-6">
          {loading && <p className="py-8 text-center text-sm text-slate-500">Loading your followers…</p>}
          {!loading && people.length === 0 && !error && (
            <div className="py-8 text-center">
              <p className="font-bold text-slate-700">No followers to message yet</p>
              <p className="mt-1 text-xs text-slate-500">People must follow you before you can invite them to a chat.</p>
            </div>
          )}
          {!loading && filteredPeople.map((person) => {
            const checked = selected.includes(person.id)
            return (
              <button type="button" key={person.id} onClick={() => togglePerson(person.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${checked ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <Avatar name={person.full_name} image={person.avatar_url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{person.full_name}</span>
                  <span className="block truncate text-xs text-slate-500">@{person.username}</span>
                </span>
                <span className={`grid h-5 w-5 place-items-center rounded-md border text-xs ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
              </button>
            )
          })}
          {!loading && query && filteredPeople.length === 0 && people.length > 0 && <p className="py-8 text-center text-sm text-slate-500">No followers match that search.</p>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <span className="text-xs text-slate-500">{selected.length === 1 ? "One-to-one chat" : selected.length > 1 ? `${selected.length} people · group chat` : "Select one or more people"}</span>
          <button type="button" onClick={() => void create()} disabled={!selected.length || saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Starting…" : "Start chat"}
          </button>
        </div>
      </section>
    </div>
  )
}

export default function MessagingPage({ conversationId }: { conversationId?: string }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messageSet, setMessageSet] = useState<{ conversationId: string | null; messages: ConversationMessage[] }>({
    conversationId: null,
    messages: [],
  })
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [replyTarget, setReplyTarget] = useState<ConversationMessage | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [listError, setListError] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearch, setGifSearch] = useState("")
  const [gifUrl, setGifUrl] = useState("")
  const [search, setSearch] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingActive = useRef(false)
  const typingLastPublished = useRef(0)
  const messageRequest = useRef(0)
  const olderMessagesLoadingRef = useRef(false)
  const scrollAnchor = useRef<{ conversationId: string; scrollHeight: number; scrollTop: number } | null>(null)
  const isAtBottom = useRef(true)
  const previousConversationId = useRef<string | undefined>(undefined)
  const previousLastMessageId = useRef<string | undefined>(undefined)
  const messageSetRef = useRef(messageSet)
  messageSetRef.current = messageSet
  const cachedVisibleMessages = userId && conversationId
    ? readCachedMessages(userId, conversationId) ?? []
    : []
  const messages = messageSet.conversationId === conversationId
    ? messageSet.messages
    : cachedVisibleMessages
  const channelName = conversationId ? `messages:${conversationId}` : `messages-inbox:${userId ?? "guest"}`
  const publishTyping = useCallback((active: boolean) => {
    if (!conversationId) return
    typingActive.current = active
    typingLastPublished.current = Date.now()
    void setConversationTyping(conversationId, active).catch(() => undefined)
  }, [conversationId])

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview("")
      return
    }
    const url = URL.createObjectURL(attachment)
    setAttachmentPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [attachment])

  const refreshConversations = useCallback(async () => {
    try {
      const result = await getMyConversations()
      setConversations(result)
      if (userId) cacheConversations(userId, result)
      setListError("")
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Could not load your conversations.")
    }
  }, [userId])

  useEffect(() => {
    let active = true
    async function initialize() {
      setLoading(true)
      try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Log in to use messages.")
        if (!active) return
        setUserId(user.id)
        const cachedConversations = readCachedConversations(user.id)
        if (cachedConversations) {
          setConversations(cachedConversations)
          setLoading(false)
        }
        const result = await getMyConversations()
        if (active) {
          setConversations(result)
          cacheConversations(user.id, result)
        }
      } catch (reason) {
        if (active) {
          const message = reason instanceof Error ? reason.message : "Could not load messages."
          setError(message)
          setListError(message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [])

  const refreshMessages = useCallback(async () => {
    if (!conversationId) {
      messageRequest.current += 1
      setMessageSet({ conversationId: null, messages: [] })
      return
    }
    const request = ++messageRequest.current
    const cachedMessages = userId ? readCachedMessages(userId, conversationId) : null
    const hasCurrentMessages = messageSetRef.current.conversationId === conversationId
    if (cachedMessages && !hasCurrentMessages) {
      setMessageSet({ conversationId, messages: cachedMessages })
    }
    if (!hasCurrentMessages && !cachedMessages) setMessagesLoading(true)
    setError("")
    try {
      const result = await getConversationMessages(conversationId)
      if (request !== messageRequest.current) return
      const mergedMessages = mergeMessages(
        messageSetRef.current.conversationId === conversationId ? messageSetRef.current.messages : cachedMessages ?? [],
        result,
      )
      messageSetRef.current = { conversationId, messages: mergedMessages }
      setMessageSet({
        conversationId,
        messages: mergedMessages,
      })
      setHasOlderMessages(result.length >= 100)
      if (userId) cacheMessages(userId, conversationId, mergedMessages)
      await markConversationRead(conversationId)
      await refreshConversations()
    } catch (reason) {
      if (request !== messageRequest.current) return
      setError(reason instanceof Error ? reason.message : "Could not load this conversation.")
    } finally {
      if (request === messageRequest.current) setMessagesLoading(false)
    }
  }, [conversationId, refreshConversations, userId])

  useEffect(() => { void refreshMessages() }, [refreshMessages])

  const loadOlderMessages = useCallback(async () => {
    const oldestMessage = messages[0]
    if (!conversationId || !userId || !oldestMessage || !hasOlderMessages || olderMessagesLoadingRef.current) return
    olderMessagesLoadingRef.current = true
    setOlderMessagesLoading(true)
    const container = scrollRef.current
    try {
      const olderMessages = await getConversationMessages(conversationId, oldestMessage.created_at)
      if (conversationId !== window.location.pathname.split("/")[2]) return
      setHasOlderMessages(olderMessages.length >= 100)
      if (!olderMessages.length) return
      if (container) {
        scrollAnchor.current = {
          conversationId,
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        }
      }
      const mergedMessages = mergeMessages(olderMessages, messageSetRef.current.conversationId === conversationId
        ? messageSetRef.current.messages
        : messages)
      messageSetRef.current = { conversationId, messages: mergedMessages }
      setMessageSet({ conversationId, messages: mergedMessages })
      cacheMessages(userId, conversationId, mergedMessages)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load older messages.")
    } finally {
      olderMessagesLoadingRef.current = false
      setOlderMessagesLoading(false)
    }
  }, [conversationId, hasOlderMessages, messages, userId])

  useEffect(() => {
    if (!userId) return
    let channel = supabase
      .channel(channelName)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const row = payload.new as { conversation_id?: string }
        if (conversationId && row.conversation_id === conversationId) void refreshMessages()
        else void refreshConversations()
      })
    if (conversationId) {
      channel = channel.on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.new as { id?: string; body?: string; edited_at?: string | null; deleted_at?: string | null }
        if (!row.id || !conversationId) return
        const current = messageSetRef.current
        if (current.conversationId !== conversationId) return
        const updatedMessages = current.messages.map((message) => message.id === row.id
          ? { ...message, body: row.body ?? message.body, edited_at: row.edited_at ?? null, deleted_at: row.deleted_at ?? null }
          : message.reply_to_id === row.id
            ? { ...message, reply_body: row.deleted_at ? "Message deleted" : row.body ?? message.reply_body }
            : message)
        const next = { conversationId, messages: updatedMessages }
        messageSetRef.current = next
        setMessageSet(next)
        if (userId) cacheMessages(userId, conversationId, updatedMessages)
      })
    }
    channel = channel.on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversation_participants",
        filter: `user_id=eq.${userId}`,
      }, () => {
        void refreshConversations()
      })
    channel = channel.on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conversation_participants",
        filter: conversationId ? `conversation_id=eq.${conversationId}` : `user_id=eq.${userId}`,
      }, () => {
        void refreshConversations()
      })
    if (conversationId) {
      channel = channel
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "conversation_typing",
          filter: `conversation_id=eq.${conversationId}`,
        }, (event) => {
          const row = event.new as { user_id?: string; is_typing?: boolean; updated_at?: string } | undefined
          if (!row?.user_id || row.user_id === userId) return
          const fresh = row.is_typing && row.updated_at && Date.now() - new Date(row.updated_at).getTime() < 8_000
          setTypingUserIds((previous) => fresh
            ? [...new Set([...previous, row.user_id!])]
            : previous.filter((id) => id !== row.user_id))
        })
    }
    const subscription = channel.subscribe()
    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [userId, conversationId, channelName, refreshMessages, refreshConversations])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const anchor = scrollAnchor.current
    if (anchor && anchor.conversationId === conversationId) {
      container.scrollTop = anchor.scrollTop + container.scrollHeight - anchor.scrollHeight
      scrollAnchor.current = null
      return
    }

    const lastMessageId = messages[messages.length - 1]?.id
    if (conversationId !== previousConversationId.current) {
      container.scrollTop = container.scrollHeight
      isAtBottom.current = true
    } else if (lastMessageId && lastMessageId !== previousLastMessageId.current && isAtBottom.current) {
      container.scrollTop = container.scrollHeight
    }
    previousConversationId.current = conversationId
    previousLastMessageId.current = lastMessageId
  }, [conversationId, messages])

  useEffect(() => {
    if (conversationId) {
      setHasOlderMessages(true)
      olderMessagesLoadingRef.current = false
      scrollAnchor.current = null
    }
    setDraft("")
    setReplyTarget(null)
    setEditingMessageId(null)
    setAttachment(null)
    setShowEmojiPicker(false)
    setShowGifPicker(false)
    setError("")
  }, [conversationId])

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (typingActive.current) publishTyping(false)
  }, [publishTyping])

  const selectedConversation = conversations.find((item) => item.conversation_id === conversationId) ?? null
  const filteredConversations = conversations.filter((conversation) => {
    const name = getConversationName(conversation, userId ?? "")
    return !search.trim() || name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const startTyping = () => {
    if (!conversationId) return
    if (!typingActive.current || Date.now() - typingLastPublished.current > 3_000) {
      publishTyping(true)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      publishTyping(false)
    }, 1400)
  }

  const onChooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Chat images must be 5 MB or smaller.")
      return
    }
    setError("")
    setAttachment(file)
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!conversationId || !userId || sending || (!draft.trim() && !attachment && !editingMessageId)) return
    setSending(true)
    setError("")
    let uploadedPath: string | null = null
    try {
      if (editingMessageId) {
        await editConversationMessage(editingMessageId, draft)
        const editedAt = new Date().toISOString()
        const updatedMessages = messages.map((message) => message.id === editingMessageId
          ? { ...message, body: draft.trim(), edited_at: editedAt }
          : message.reply_to_id === editingMessageId
            ? { ...message, reply_body: draft.trim() }
            : message)
        const next = { conversationId, messages: updatedMessages }
        messageSetRef.current = next
        setMessageSet(next)
        cacheMessages(userId, conversationId, updatedMessages)
        setDraft("")
        setEditingMessageId(null)
        setReplyTarget(null)
        void refreshConversations()
        return
      }
      if (attachment) uploadedPath = await uploadChatImage(attachment, conversationId)
      await sendConversationMessage(conversationId, userId, draft, uploadedPath, replyTarget?.id)
      setDraft("")
      setAttachment(null)
      setReplyTarget(null)
      setShowEmojiPicker(false)
      setShowGifPicker(false)
      publishTyping(false)
      await refreshMessages()
    } catch (reason) {
      if (uploadedPath) {
        await supabase.storage.from("chat-attachments").remove([uploadedPath]).catch(() => undefined)
      }
      setError(reason instanceof Error ? reason.message : "Your message could not be sent.")
    } finally {
      setSending(false)
    }
  }

  const startReply = (message: ConversationMessage) => {
    setEditingMessageId(null)
    setReplyTarget(message)
    setShowEmojiPicker(false)
    setShowGifPicker(false)
  }

  const startEdit = (message: ConversationMessage) => {
    setReplyTarget(null)
    setEditingMessageId(message.id)
    setDraft(message.body)
    setAttachment(null)
    setShowEmojiPicker(false)
    setShowGifPicker(false)
  }

  const removeMessage = async (message: ConversationMessage) => {
    if (!userId || !conversationId || !window.confirm("Delete this message?")) return
    setError("")
    try {
      await deleteConversationMessage(message.id)
      const updatedMessages = messages.map((item) => item.id === message.id
        ? { ...item, body: "", deleted_at: new Date().toISOString() }
        : item.reply_to_id === message.id
          ? { ...item, reply_body: "Message deleted" }
        : item)
      const next = { conversationId, messages: updatedMessages }
      messageSetRef.current = next
      setMessageSet(next)
      cacheMessages(userId, conversationId, updatedMessages)
      if (replyTarget?.id === message.id) setReplyTarget(null)
      void refreshConversations()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this message.")
    }
  }

  const createFromFollowers = (id: string) => {
    setShowNew(false)
    navigate(`/messages/${id}`)
  }

  const messageName = selectedConversation ? getConversationName(selectedConversation, userId ?? "") : "Conversation"
  const typingNames = selectedConversation?.participants
    .filter((participant) => typingUserIds.includes(participant.id))
    .map((participant) => participant.full_name) ?? []

  if (loading) {
    return <main className="mx-auto max-w-[1280px] px-4 py-10"><div className="h-[68vh] animate-pulse rounded-3xl bg-slate-100" /></main>
  }
  if (!userId) {
    return (
      <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl">✉</div>
          <h1 className="mt-5 text-2xl font-extrabold">Your inbox, your community</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{error || "Log in to start a private conversation with people who follow you."}</p>
          <button onClick={() => navigate("/login")} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Log in</button>
        </div>
      </main>
    )
  }

  return (
    <main className={`messages-page mx-auto max-w-[1280px] px-3 py-5 sm:px-5 sm:py-8 lg:px-6 ${conversationId ? "messages-page-conversation" : ""}`}>
      <div className="messages-page-heading mb-5 flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="messages-back-home hidden h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
          aria-label="Back to home"
        >
          ‹
        </button>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">Your community</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Messages</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700">
          <span className="text-lg leading-none">＋</span><span className="hidden sm:inline">New message</span><span className="sm:hidden">New</span>
        </button>
      </div>
      <div className={`messages-layout grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_42px_rgba(20,43,73,.07)] md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[350px_minmax(0,1fr)] ${conversationId ? "messages-layout-conversation" : ""}`}>
        <aside className={`${conversationId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-100`}>
          <div className="messages-search border-b border-slate-100 p-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="w-full rounded-xl bg-slate-50 py-3 pl-9 pr-3 text-xs outline-none ring-blue-100 focus:ring-2" />
            </div>
          </div>
          {listError && <p role="alert" className="mx-3 mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{listError}</p>}
          <div className="messages-conversation-list min-h-0 flex-1 overflow-y-auto p-2">
            {filteredConversations.map((conversation) => {
              const name = getConversationName(conversation, userId)
              const unread = Number(conversation.unread_count) > 0
              return (
                <button key={conversation.conversation_id} onClick={() => navigate(`/messages/${conversation.conversation_id}`)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${conversationId === conversation.conversation_id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                  <span className="relative">
                    <Avatar name={name} image={getConversationAvatar(conversation, userId)} size="h-12 w-12" />
                    {conversation.conversation_type === "group" && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-orange-100 text-[9px]">👥</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${unread ? "font-extrabold text-slate-900" : "font-bold text-slate-700"}`}>{name}</span>
                      <span className="shrink-0 text-[9px] text-slate-400">{formatTime(conversation.last_message_at)}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className={`truncate text-[10px] ${unread ? "font-bold text-slate-700" : "text-slate-500"}`}>
                        {conversation.last_message_id
                          ? conversation.last_message_attachment_path && !conversation.last_message_body ? "📷 Photo" : conversation.last_message_body
                          : "Start the conversation"}
                      </span>
                      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </span>
                  </span>
                </button>
              )
            })}
            {!filteredConversations.length && !listError && (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-xl">✉</span>
                <p className="mt-4 text-sm font-extrabold text-slate-700">{search ? "No matches" : "A quiet inbox"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{search ? "Try another name." : "Start a one-to-one or group conversation with your followers."}</p>
                {!search && <button onClick={() => setShowNew(true)} className="mt-4 text-xs font-extrabold text-blue-600">Start a chat →</button>}
              </div>
            )}
          </div>
        </aside>

        <section className={`${conversationId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col bg-[#fbfcfe]`}>
          {selectedConversation ? (
            <>
              <header className="messages-conversation-topbar flex min-h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 sm:px-6">
                <button onClick={() => navigate("/messages")} className="grid h-9 w-9 place-items-center rounded-xl text-lg text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Back to inbox">‹</button>
                <Avatar name={messageName} image={getConversationAvatar(selectedConversation, userId)} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-extrabold">{messageName}</h2>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {selectedConversation.conversation_type === "group"
                      ? `${selectedConversation.participants.length} participants`
                      : `@${selectedConversation.participants.find((item) => item.id !== userId)?.username ?? ""}`}
                  </p>
                </div>
              </header>
              <div
                ref={scrollRef}
                onScroll={(event) => {
                  const container = event.currentTarget
                  isAtBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80
                  if (container.scrollTop < 80) void loadOlderMessages()
                }}
                className="messaging-history-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7"
              >
                {olderMessagesLoading && <p className="mb-4 text-center text-xs text-slate-400">Loading older messages…</p>}
                {!hasOlderMessages && messages.length > 0 && <p className="mb-4 text-center text-[10px] text-slate-400">You’re at the beginning of this conversation</p>}
                {messagesLoading && !messages.length && <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className={`h-14 w-2/3 animate-pulse rounded-2xl bg-slate-100 ${item % 2 ? "" : "ml-auto"}`} />)}</div>}
                {!messagesLoading && !messages.length && !error && (
                  <div className="grid h-full place-items-center">
                    <div className="max-w-xs text-center">
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl">✦</span>
                      <p className="mt-4 font-extrabold text-slate-800">Say hello to {messageName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">A friendly message is a great way to get a conversation started.</p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((message) => {
                    const mine = message.sender_id === userId
                    const seenCount = selectedConversation.participants.filter((participant) =>
                      participant.id !== userId && participant.last_read_at && new Date(participant.last_read_at).getTime() >= new Date(message.created_at).getTime(),
                    ).length
                    const gifUrl = !message.deleted_at ? getGifLink(message.body) : null
                    const messageText = gifUrl ? message.body.replace(gifUrl, "").trim() : message.body
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && <Avatar name={message.sender_full_name} image={message.sender_avatar_url} size="h-7 w-7" />}
                        <div className={`max-w-[85%] sm:max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                          {!mine && selectedConversation.conversation_type === "group" && <span className="mb-1 px-2 text-[9px] font-bold text-slate-500">{message.sender_full_name}</span>}
                          {message.reply_to_id && (
                            <div className={`mb-1 max-w-full rounded-xl border-l-2 border-blue-400 px-3 py-2 text-[10px] ${mine ? "bg-blue-50 text-slate-600" : "bg-white text-slate-500"}`}>
                              <p className="font-bold">{message.reply_sender_name || "Reply"}</p>
                              <p className="mt-0.5 truncate">{message.reply_body || "Message unavailable"}</p>
                            </div>
                          )}
                          <div className={`overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-800"}`}>
                            {message.deleted_at ? (
                              <p className="italic opacity-75">This message was deleted</p>
                            ) : (
                              <>
                                {message.attachment_url && <img src={message.attachment_url} alt="Shared image" className="mb-2 max-h-72 w-full max-w-xs rounded-xl object-cover" />}
                                {gifUrl && isDirectGifUrl(gifUrl) && <img src={gifUrl} alt="Shared GIF" className="mb-2 max-h-72 w-full max-w-xs rounded-xl object-cover" />}
                                {gifUrl && !isDirectGifUrl(gifUrl) && <a href={gifUrl} target="_blank" rel="noreferrer" className="mb-2 block text-xs font-bold underline">Open GIF</a>}
                                {messageText && <p className="whitespace-pre-wrap break-words leading-6">{messageText}</p>}
                              </>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 px-1 text-[9px] text-slate-400">
                            <span>{formatTime(message.created_at)}</span>
                            {message.edited_at && !message.deleted_at && <span>Edited</span>}
                            {mine && seenCount > 0 && <span className="font-bold text-blue-600">{selectedConversation.conversation_type === "group" ? `Seen by ${seenCount}` : "Seen"}</span>}
                          </div>
                          <div className="mt-1 flex gap-2 px-1">
                            <button type="button" onClick={() => startReply(message)} className="text-[10px] font-bold text-slate-500 hover:text-blue-600">Reply</button>
                            {mine && !message.deleted_at && (
                              <>
                                <button type="button" onClick={() => startEdit(message)} className="text-[10px] font-bold text-slate-500 hover:text-blue-600">Edit</button>
                                <button type="button" onClick={() => void removeMessage(message)} className="text-[10px] font-bold text-slate-500 hover:text-red-600">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {typingNames.length > 0 && (
                <p className="shrink-0 border-t border-slate-100 bg-white px-5 py-2 text-[10px] font-semibold text-slate-500">
                  {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
                </p>
              )}
              {attachment && (
                <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white px-4 py-2 sm:px-6">
                  <img src={attachmentPreview} alt="Selected attachment preview" className="h-12 w-12 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{attachment.name}</span>
                  <button type="button" onClick={() => setAttachment(null)} className="text-xs font-bold text-slate-500">Remove</button>
                </div>
              )}
              {error && <div role="alert" className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 sm:px-6">{error}</div>}
              <form onSubmit={(event) => void send(event)} className="relative flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white p-3 sm:px-6 sm:py-4">
                {(replyTarget || editingMessageId) && (
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {editingMessageId
                        ? "Editing your message"
                        : `Replying to ${replyTarget?.sender_full_name}: ${replyTarget?.deleted_at ? "Message deleted" : replyTarget?.body || "Attachment"}`}
                    </span>
                    <button type="button" onClick={() => { setReplyTarget(null); setEditingMessageId(null); setDraft("") }} className="shrink-0 font-bold text-slate-500">Cancel</button>
                  </div>
                )}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-3 z-30 mb-2 w-[min(352px,calc(100vw-2rem))]">
                    <Suspense fallback={<div className="grid h-[350px] place-items-center rounded-2xl border border-slate-200 bg-white text-xs text-slate-500">Loading emojis…</div>}>
                      <EmojiPicker
                        onEmojiClick={(emoji) => setDraft((current) => `${current}${emoji.emoji}`)}
                        width="100%"
                        height={350}
                      />
                    </Suspense>
                  </div>
                )}
                {showGifPicker && (
                  <div className="absolute bottom-full left-3 z-30 mb-2 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <p className="text-sm font-extrabold text-slate-800">Share a GIF</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">Search Tenor for free, then paste a Tenor or Giphy link below. Direct GIF links preview in chat.</p>
                    <div className="mt-3 flex gap-2">
                      <input value={gifSearch} onChange={(event) => setGifSearch(event.target.value)} placeholder="Search GIFs on Tenor" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" />
                      <a href={`https://tenor.com/search/${encodeURIComponent(gifSearch.trim() || "trending")}-gifs`} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Search</a>
                    </div>
                    <input value={gifUrl} onChange={(event) => setGifUrl(event.target.value)} onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        if (!getGifLink(gifUrl)) {
                          setError("Paste a valid Tenor or Giphy GIF link.")
                          return
                        }
                        setDraft((current) => `${current}${current.trim() ? " " : ""}${gifUrl.trim()}`)
                        setGifUrl("")
                        setShowGifPicker(false)
                      }
                    }} placeholder="Paste GIF URL" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowGifPicker(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500">Cancel</button>
                      <button type="button" onClick={() => {
                        if (!getGifLink(gifUrl)) {
                          setError("Paste a valid Tenor or Giphy GIF link.")
                          return
                        }
                        setDraft((current) => `${current}${current.trim() ? " " : ""}${gifUrl.trim()}`)
                        setGifUrl("")
                        setShowGifPicker(false)
                      }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Add GIF</button>
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2 sm:gap-3">
                  <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-xl text-slate-500 transition hover:bg-slate-100" aria-label="Attach an image">
                    <span>＋</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChooseFile} />
                  </label>
                  <button type="button" onClick={() => { setShowEmojiPicker((shown) => !shown); setShowGifPicker(false) }} className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-lg text-slate-500 transition hover:bg-slate-100" aria-label="Add emoji">☺</button>
                  <button type="button" onClick={() => { setShowGifPicker((shown) => !shown); setShowEmojiPicker(false); setError("") }} className="h-10 shrink-0 rounded-lg bg-slate-100 px-2 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-200" aria-label="Add GIF">GIF</button>
                  <textarea value={draft} onChange={(event) => { setDraft(event.target.value); startTyping() }} onBlur={() => {
                    if (typingTimer.current) clearTimeout(typingTimer.current)
                    if (typingActive.current) publishTyping(false)
                  }} rows={1} maxLength={4000} placeholder={editingMessageId ? "Edit your message…" : "Write a message…"} className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 outline-none ring-blue-100 focus:ring-2" />
                  <button type="submit" disabled={sending || (!draft.trim() && !attachment && !editingMessageId)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-lg text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400" aria-label={editingMessageId ? "Save edit" : "Send message"}>
                    {sending ? "…" : editingMessageId ? "✓" : "➤"}
                  </button>
                </div>
              </form>
              <p className="shrink-0 bg-white px-4 pb-3 text-[9px] text-slate-400 sm:px-6">Images · emojis · GIF links · JPG, PNG or WebP up to 5 MB</p>
            </>
          ) : conversationId ? (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div><p className="font-extrabold text-slate-800">{error || "Conversation not found"}</p><button onClick={() => navigate("/messages")} className="mt-3 text-xs font-bold text-blue-600">Back to inbox</button></div>
            </div>
          ) : (
            <div className="hidden flex-1 place-items-center p-8 text-center md:grid">
              <div className="max-w-sm">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-3xl text-blue-600">✉</span>
                <h2 className="mt-5 text-lg font-extrabold">A little closer to your community</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Choose a conversation or start a new one with people who follow you.</p>
                <button onClick={() => setShowNew(true)} className="mt-5 rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white">Start a conversation</button>
              </div>
            </div>
          )}
        </section>
      </div>
      {showNew && <NewConversationDialog userId={userId} onClose={() => setShowNew(false)} onCreated={createFromFollowers} />}
    </main>
  )
}
