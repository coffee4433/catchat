'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Info,
  Loader2,
  MessageSquarePlus,
  SendHorizontal,
  Copy,
  Pin,
  Volume2,
  Reply,
  Forward,
  Trash2,
  Smile,
  Compass,
  Eye,
  Pencil,
  X,
  MoreHorizontal,
  ChevronDown,
  Search,
  Phone,
  Video,
  UserPlus,
  Star,
  Languages,
  Check,
} from 'lucide-react'
import { IoCheckmarkDone, IoCheckmarkCircleOutline } from 'react-icons/io5'
import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { useLanguage } from '@/lib/i18n'
import { usePrefs } from '@/hooks/use-prefs'
import { translateText } from '@/lib/translate'
import { LANGUAGES, getLanguageName } from '@/lib/languages'
import { getTranslatorFavorites, saveTranslatorFavorites } from '@/app/actions/preferences'
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
import {
  createConversation,
  getMessages,
  sendMessage,
  getTypingUsers,
  reportTyping,
  deleteMessage,
  editMessage,
  togglePinMessage,
  addMessageReaction,
  forwardMessage,
  getConversations,
  markMessagesAsRead,
  markConversationAsRead,
  type MessageWithSender,
  type ReactionData,
} from '@/app/actions/chat'
import { reportTypingSupabase, stopTypingSupabase } from '@/app/actions/typing-supabase'
import { supabase } from '@/lib/supabase/client'
import { AddMembersModal } from '@/components/add-members-modal'
import { useCallContext } from '@/components/calls/call-provider'
import { UserPopover, type PopoverUser } from '@/components/user-popover'
import { UserProfileModal } from '@/components/user-profile-modal'
import type { Conversation } from '@/components/chat-app'

function formatDateLabel(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  const oneDay = 86400000

  if (diff === 0) return 'Hoy'
  if (diff === oneDay) return 'Ayer'
  if (diff < oneDay * 7) {
    return d.toLocaleDateString('es', { weekday: 'long' })
  }
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: Date | string, b: Date | string) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// --- Gradient Particles & Animate Pop Reactions (Discord Style) ---------------

const PARTICLE_GRADIENTS = [
  'linear-gradient(135deg, #ff007f, #ff00ff)', // Rosa / Violeta
  'linear-gradient(135deg, #00f0ff, #0072ff)', // Cyan / Azul
  'linear-gradient(135deg, #ffbc00, #ff0058)', // Amarillo / Naranja
  'linear-gradient(135deg, #2af598, #009efd)', // Verde / Aqua
  'linear-gradient(135deg, #fecfef, #ff007f)', // Pastel Pink
]

function ParticleBurst() {
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 8 + (Math.random() - 0.5) * 0.4
    const distance = 25 + Math.random() * 20
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance
    const size = 4 + Math.random() * 4
    const gradient = PARTICLE_GRADIENTS[i % PARTICLE_GRADIENTS.length]

    return {
      id: i,
      x,
      y,
      size,
      gradient,
    }
  })

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            scale: [1, 1.2, 0],
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.gradient,
            boxShadow: '0 0 4px rgba(255,255,255,0.4)',
          }}
        />
      ))}
    </div>
  )
}

interface ReactionButtonProps {
  emoji: string
  count: number
  hasMyReaction: boolean
  onClick: (e: React.MouseEvent) => void
  title: string
}

function ReactionButton({ emoji, count, hasMyReaction, onClick, title }: ReactionButtonProps) {
  const [burstTrigger, setBurstTrigger] = useState(0)
  const [spawnFlash, setSpawnFlash] = useState(false)
  const prevCount = useRef(count)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Cuando el botón aparece en la pantalla (nace la reacción), disparamos el destello
    setSpawnFlash(true)
    const timer = setTimeout(() => setSpawnFlash(false), 900)
    isInitialMount.current = false
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Si el contador aumenta Y no es el montaje inicial, disparamos las partículas radiales
    if (!isInitialMount.current && count > prevCount.current) {
      setBurstTrigger((v) => v + 1)
    }
    prevCount.current = count
  }, [count])

  return (
    <div className="relative inline-block z-10">
      {/* Destello de Gradient Impresionante de fondo para nueva reacción */}
      <AnimatePresence>
        {spawnFlash && (
          <motion.div
            initial={{ scale: 0.8, opacity: 1, filter: 'blur(3px)' }}
            animate={{ scale: 1.5, opacity: 0, filter: 'blur(6px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 rounded bg-linear-to-r from-[#ff007f] via-[#7f00ff] to-[#00f0ff] z-[-1] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        title={title}
        animate={burstTrigger ? { scale: [1, 1.28, 0.95, 1], rotate: [0, 8, -8, 0] } : {}}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition-all h-6 relative ${
          hasMyReaction
            ? 'bg-primary/10 border-primary/50 text-primary font-medium shadow-sm'
            : 'bg-secondary border-border text-foreground hover:bg-secondary/80'
        }`}
      >
        <span>{emoji}</span>
        <span>{count}</span>
      </motion.button>

      {/* Partículas animadas si el burstTrigger aumenta (hacer clic encima) */}
      {burstTrigger > 0 && (
        <ParticleBurst key={burstTrigger} />
      )}
    </div>
  )
}

export function ChatThread({
  infoOpen,
  onToggleInfo,
  user,
  conversation,
  onConversationChange,
  onConversationInfoChange,
}: {
  infoOpen?: boolean
  onToggleInfo?: () => void
  user: { id: string; name: string; email: string; image?: string | null }
  conversation: Conversation | null
  onConversationChange: (id: number) => void
  onConversationInfoChange?: (conversationId: number) => void
}) {
  const { lang, t } = useLanguage()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [lastUsedEmojis, setLastUsedEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lastUsedEmojis')
      if (stored) {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : ['👍', '❤️']
      }
    } catch {
      // ignore
    }
    return ['👍', '❤️']
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pinBtnRef = useRef<HTMLButtonElement>(null)
  const wasAtBottom = useRef(true)
  const lastReportedTyping = useRef<number>(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [prefs] = usePrefs()

  const { startOutgoingCall } = useCallContext()

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!conversation?.isDirect || !conversation?.otherUser) return
    startOutgoingCall(
      conversation.id,
      type,
      conversation.otherUser.id,
      conversation.otherUser.name,
      conversation.otherUser.image,
    )
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: prefs.timeFormat === '12h',
      timeZone: prefs.timezone,
    })
  }

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    msg: MessageWithSender
  } | null>(null)

  // Edit Message state
  const [editingMessage, setEditingMessage] = useState<MessageWithSender | null>(null)

  // Thread Reply state
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null)

  // Forwarding Modal state
  const [forwardingMsg, setForwardingMsg] = useState<MessageWithSender | null>(null)
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false)
  const [addMembersOpen, setAddMembersOpen] = useState(false)

  // Pending Messages state (for instant sending)
  const [pendingMessages, setPendingMessages] = useState<MessageWithSender[]>([])

  // Scroll to bottom bar state (Discord style)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Emoji Picker state
  const [emojiPicker, setEmojiPicker] = useState<{ msgId: number; x: number; y: number } | null>(null)

  // Delete Confirmation Modal state
  const [deletingMessageConfirm, setDeletingMessageConfirm] = useState<MessageWithSender | null>(null)

  // Pin/Unpin Confirmation Modal states
  const [pinConfirmMsg, setPinConfirmMsg] = useState<MessageWithSender | null>(null)
  const [unpinConfirmMsg, setUnpinConfirmMsg] = useState<MessageWithSender | null>(null)
  const [pinBurstId, setPinBurstId] = useState<number | null>(null)
  const [seenPinnedIds, setSeenPinnedIds] = useState<Set<number>>(new Set())
  const [glowingPinnedIds, setGlowingPinnedIds] = useState<Set<number>>(new Set())
  const [fadingPinnedIds, setFadingPinnedIds] = useState<Set<number>>(new Set())

  // Message Search states
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)
  const [forwardedStatus, setForwardedStatus] = useState<Record<number, boolean>>({})

  // Translator state
  const [translateTarget, setTranslateTarget] = useState<string | null>(null)
  const [translatorMenuOpen, setTranslatorMenuOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const translatorBtnRef = useRef<HTMLButtonElement>(null)
  const [translatorMenuPos, setTranslatorMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [languageSearch, setLanguageSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(['en', 'es'])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // User popover / profile modal state
  const [popoverUser, setPopoverUser] = useState<PopoverUser | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [profileModalUser, setProfileModalUser] = useState<PopoverUser | null>(null)

  useEffect(() => {
    getTranslatorFavorites().then(setFavorites).catch(() => {})
  }, [])

  function toggleFavorite(code: string) {
    setFavorites((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      saveTranslatorFavorites(next).catch(() => {})
      return next
    })
  }

  // Track previous info panel open state before search hijacked it
  const wasInfoOpenRef = useRef(false)

  // Watch search query changes to auto-toggle panels and restore info panel when cleared
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      if (infoOpen) {
        wasInfoOpenRef.current = true
        onToggleInfo?.()
      }
      if (!searchOpen) {
        setSearchOpen(true)
      }
    } else {
      if (searchOpen) {
        setSearchOpen(false)
        if (wasInfoOpenRef.current) {
          onToggleInfo?.()
          wasInfoOpenRef.current = false
        }
      }
    }
  }, [searchQuery])

  const handleJumpToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-card-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(msgId)
      setTimeout(() => {
        setHighlightedMessageId(null)
      }, 2000)
    }
  }

  const {
    data: messages = [],
    mutate: mutateMessages,
    isLoading,
  } = useSWR<MessageWithSender[]>(
    conversation ? ['messages', conversation.id] : null,
    () => getMessages(conversation!.id),
    { refreshInterval: 1000 }, // Actualizado: de 4000ms a 1000ms para refrescos más rápidos
  )

  // Realtime typing indicator con Supabase
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  // Para forzar la limpieza si la BD no lo hace a tiempo
  const typingUsersLastUpdate = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!conversation?.id) return
    
    // Limpiar usuarios que llevan >5s sin escribir (fallback local)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const stale: string[] = [];

      Object.entries(typingUsersLastUpdate.current).forEach(([name, timestamp]) => {
        if ((now - timestamp) >= 5000) stale.push(name);
      });

      if (stale.length > 0) {
        stale.forEach(name => delete typingUsersLastUpdate.current[name]);
        setTypingUsers(prev => prev.filter(u => !stale.includes(u)));
      }
    }, 1000);

    // Suscribirse a cambios en typing_status
    const channel = supabase
      .channel(`typing:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          // DELETE: remover instantáneamente sin re-consultar
          if (payload?.eventType === 'DELETE' && payload.old?.user_name) {
            const deletedUser = payload.old.user_name;
            delete typingUsersLastUpdate.current[deletedUser];
            setTypingUsers(current => current.filter(u => u !== deletedUser));
            return;
          }

          // INSERT/UPDATE: re-consultar el estado actual
          const { data, error } = await supabase
            .from('typing_status')
            .select('user_name, user_id, updated_at')
            .eq('conversation_id', conversation.id)
            .eq('is_typing', true)
            .neq('user_id', user.id)

          if (!error && data) {
            const now = new Date().getTime();
            const activeUsers = data
              .filter(row => {
                const updatedAt = new Date(row.updated_at).getTime();
                return (now - updatedAt) < 5000;
              })
              .map(row => {
                typingUsersLastUpdate.current[row.user_name] = now;
                return row.user_name;
              });

            setTypingUsers(activeUsers);
          }
        }
      )
      .subscribe()

    // Flag para evitar .then() obsoletos después del cleanup
    let cancelled = false

    // Ejecutar una consulta inicial para coger el estado actual
    supabase
      .from('typing_status')
      .select('user_name, updated_at')
      .eq('conversation_id', conversation.id)
      .eq('is_typing', true)
      .neq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          const now = new Date().getTime();
          const activeUsers = data
            .filter(row => {
              const updatedAt = new Date(row.updated_at).getTime();
              return (now - updatedAt) < 5000;
            })
            .map(row => {
              typingUsersLastUpdate.current[row.user_name] = now;
              return row.user_name;
            });
          setTypingUsers(activeUsers);
        }
      });

    // Cleanup: Limpiar suscripción al desmontar
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      clearInterval(cleanupInterval)
    }
  }, [conversation?.id, user.id])

  // TEMPORAL: Estado para debug del typing indicator (puedes eliminarlo después de probar)
  const [debugTyping, setDebugTyping] = useState(false)

  // Fetch all conversations for forwarding target
  const { data: allConversations = [] } = useSWR('conversations', getConversations)

  const allMessages = [...messages, ...pendingMessages]

  const handleOpenEmojiPicker = (e: React.MouseEvent, msgId: number) => {
    e.stopPropagation()
    let x = e.clientX
    let y = e.clientY
    const pickerWidth = 350
    const pickerHeight = 400

    if (x + pickerWidth > window.innerWidth) {
      x = window.innerWidth - pickerWidth - 10
    }
    if (x < 10) x = 10

    if (y + pickerHeight > window.innerHeight) {
      y = window.innerHeight - pickerHeight - 10
    }
    if (y < 10) y = 10

    setEmojiPicker({ msgId, x, y })
    setContextMenu(null)
  }

  // Smart auto-scroll: instantly scroll to bottom for new messages or typing indicators
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (wasAtBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [allMessages.length, typingUsers.length, conversation?.id])

  // Scroll smoothly when reply or edit state changes to adjust layout height smoothly
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (wasAtBottom.current) {
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 50)
    }
  }, [replyingTo, editingMessage])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 150
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    wasAtBottom.current = isNearBottom
    setShowScrollToBottom(!isNearBottom)
  }

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      setShowScrollToBottom(false)
      wasAtBottom.current = true
    }
  }

  // Always scroll to bottom on conversation change
  useEffect(() => {
    wasAtBottom.current = true
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation?.id])

  // Reset seen pinned ids when changing conversations
  useEffect(() => {
    setSeenPinnedIds(new Set())
    setGlowingPinnedIds(new Set())
    setFadingPinnedIds(new Set())
  }, [conversation?.id])

  // Mark all messages as read when viewing the conversation
  useEffect(() => {
    if (!conversation?.id || messages.length === 0) return

    // Filter messages that are not from the current user and haven't been read yet
    // Pinned messages are excluded: they're only marked read when the pin button is clicked
    const unreadMessageIds = messages
      .filter((msg) => {
        if (msg.userId === user.id) return false // Skip own messages
        if (msg.isPinned) return false // Skip pinned - marked read only via pin button
        
        let readByList: string[] = []
        if (msg.readBy) {
          try {
            readByList = JSON.parse(msg.readBy)
          } catch {
            readByList = []
          }
        }
        
        return !readByList.includes(user.id)
      })
      .map((msg) => msg.id)

    if (unreadMessageIds.length > 0) {
      // Mark messages as read immediately (300ms delay for visibility assurance)
      const timer = setTimeout(() => {
        markMessagesAsRead(unreadMessageIds).then(() => {
          // Force immediate refetch after marking as read
          mutateMessages()
        }).catch(() => {
          // Silently fail - read receipts are not critical
        })
      }, 300) // Reducido de 1000ms a 300ms

      return () => clearTimeout(timer)
    }
  }, [conversation?.id, messages, user.id, mutateMessages])

  const handleInputChange = (val: string) => {
    setDraft(val)
    if (!conversation) return

    // Reportar typing con Supabase (más rápido y en tiempo real)
    if (val.trim().length > 0) {
      // Throttle reporting typing to once every 2 seconds
      const now = Date.now()
      if (now - lastReportedTyping.current > 2000) {
        lastReportedTyping.current = now
        reportTypingSupabase(conversation.id, user.name).catch(() => {})
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTypingSupabase(conversation.id).catch(e => console.warn('stopTypingSupabase failed:', e))
        lastReportedTyping.current = 0
      }, 1500)
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      // Si borró todo el texto, dejar de reportar typing inmediatamente
      stopTypingSupabase(conversation.id).catch(e => console.warn('stopTypingSupabase failed:', e))
      lastReportedTyping.current = 0
    }
  }

  const showContextMenu = (clientX: number, clientY: number, msg: MessageWithSender) => {
    let x = clientX
    let y = clientY
    const menuWidth = 240
    const menuHeight = 520

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    if (x < 10) x = 10

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }
    if (y < 10) y = 10

    setContextMenu({ x, y, msg })
  }

  const handleContextMenu = (e: React.MouseEvent, msg: MessageWithSender) => {
    e.preventDefault()
    showContextMenu(e.clientX, e.clientY, msg)
  }

  const handleCopyText = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      /* ignore */
    }
  }

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await deleteMessage(msgId)
      await mutateMessages()
      if (conversation) {
        onConversationInfoChange?.(conversation.id)
      }
    } catch {
      /* ignore */
    }
  }

  const handleEditInit = (msg: MessageWithSender) => {
    setEditingMessage(msg)
    setDraft(msg.content)
    setReplyingTo(null)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setDraft('')
  }

  const handleSpeakMessage = (txt: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(txt)
      utterance.lang = 'es-ES'
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleTogglePin = async (msgId: number) => {
    const msg = messages.find((m) => m.id === msgId)
    const wasPinned = msg?.isPinned

    // Optimistic update: toggle isPinned immediately in local cache
    const nextMessages = messages.map((m) =>
      m.id === msgId ? { ...m, isPinned: !m.isPinned, pinnedBy: !m.isPinned ? user.id : null } : m
    )
    mutateMessages(nextMessages, false)

    try {
      await togglePinMessage(msgId)
      await mutateMessages()
    } catch {
      // Revert on error
      await mutateMessages()
    }

    if (!wasPinned) {
      setPinBurstId(msgId)
      setTimeout(() => setPinBurstId(null), 900)
    }
  }

  const handleReact = async (msgId: number, emoji: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    const myUserId = user.id
    const myUsername = user.name

    // 1. Update last used emojis
    setLastUsedEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji)
      const updated = [emoji, ...filtered].slice(0, 2) // keep last 2 used
      try {
        localStorage.setItem('lastUsedEmojis', JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })

    // 2. Calculate next optimistic messages state locally with safe deep clones
    const nextMessages = messages.map((m) => {
      if (m.id !== msgId) return m

      let reactionsList: ReactionData[] = []
      if (m.reactions) {
        try {
          reactionsList = JSON.parse(m.reactions).map((r: any) => ({
            emoji: r.emoji,
            userIds: r.userIds ? [...r.userIds] : [],
            usernames: r.usernames ? [...r.usernames] : [],
          }))
        } catch {
          reactionsList = []
        }
      }

      const existingReaction = reactionsList.find((r) => r.emoji === emoji)
      if (existingReaction) {
        if (!existingReaction.userIds) existingReaction.userIds = []
        if (!existingReaction.usernames) existingReaction.usernames = []

        const userIndex = existingReaction.userIds.indexOf(myUserId)
        if (userIndex > -1) {
          existingReaction.userIds.splice(userIndex, 1)
          const nameIndex = existingReaction.usernames.indexOf(myUsername)
          if (nameIndex > -1) existingReaction.usernames.splice(nameIndex, 1)
        } else {
          // Add my reaction
          existingReaction.userIds.push(myUserId)
          if (!existingReaction.usernames.includes(myUsername)) {
            existingReaction.usernames.push(myUsername)
          }
        }
      } else {
        // Create new reaction group
        reactionsList.push({ emoji, userIds: [myUserId], usernames: [myUsername] })
      }

      // Clean empty reaction lists
      reactionsList = reactionsList.filter((r) => r.userIds && r.userIds.length > 0)

      return {
        ...m,
        reactions: reactionsList.length > 0 ? JSON.stringify(reactionsList) : null,
      }
    })

    // 3. Perform optimistic update without revalidating immediately
    mutateMessages(nextMessages, false)

    try {
      // 4. Send the real update to the database in background
      await addMessageReaction(msgId, emoji)
      // 5. Finally fetch server ground truth to be sync
      await mutateMessages()
    } catch {
      // Rollback to original server data on error
      await mutateMessages()
    }
  }

  const handleForwardMessage = async (targetId: number) => {
    if (!forwardingMsg) return
    try {
      await forwardMessage(forwardingMsg.id, targetId)
      setForwardedStatus((prev) => ({ ...prev, [targetId]: true }))
      onConversationInfoChange?.(targetId)
    } catch {
      /* ignore */
    }
  }

  const handleSend = async () => {
    let content = draft.trim()
    if (!content || sending) return

    if (translateTarget && !editingMessage) {
      setTranslating(true)
      try {
        content = await translateText(content, translateTarget)
      } catch {
        // Translation unavailable — send original
      } finally {
        setTranslating(false)
      }
    }

    if (editingMessage) {
      setSending(true)
      try {
        await editMessage(editingMessage.id, content)
        setEditingMessage(null)
        setDraft('')
        await mutateMessages()
      } catch {
        // Restore on error
        setDraft(content)
      } finally {
        setSending(false)
      }
    } else {
      // 1. New Message Optimistic Flow
      let conversationId = conversation?.id
      if (!conversationId) {
        // Si no hay conversación activa, no podemos hacer flujo optimista completo ya que dependemos del id del backend.
        // Hacemos el flujo normal síncrono.
        setSending(true)
        try {
          const created = await createConversation(content.slice(0, 60))
          conversationId = created.id
          onConversationChange(created.id)
          await sendMessage(conversationId, content, replyingTo?.id ?? undefined)
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          stopTypingSupabase(conversationId).catch(e => console.warn('stopTypingSupabase failed:', e))

          setReplyingTo(null)
          wasAtBottom.current = true
          await mutateMessages()
          onConversationChange(conversationId)
          onConversationInfoChange?.(conversationId)
        } catch {
          setDraft(content)
        } finally {
          setSending(false)
        }
        return;
      }

      // Crear mensaje optimista
      const tempId = -Math.floor(Math.random() * 1000000)
      const optimisticMsg: MessageWithSender = {
        id: tempId,
        conversationId,
        userId: user.id,
        content,
        replyToId: replyingTo?.id || null,
        isPinned: false,
        pinnedBy: null,
        reactions: null,
        readBy: null,
        createdAt: new Date(),
        senderName: user.name,
        senderImage: user.image || null,
      }

      // Añadir mensaje optimista al estado de pendientes local instantáneamente
      setPendingMessages((prev) => [...prev, optimisticMsg])

      // Limpiar borrador y estado de respuesta instantáneamente
      setDraft('')
      const prevReplyingTo = replyingTo
      setReplyingTo(null)
      wasAtBottom.current = true

      try {
        // Enviar en background
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        stopTypingSupabase(conversationId).catch(e => console.warn('stopTypingSupabase failed:', e))

        await sendMessage(conversationId, content, prevReplyingTo?.id ?? undefined)
        await mutateMessages()
        onConversationInfoChange?.(conversationId)
      } catch {
        // Rollback
        setDraft(content)
        setReplyingTo(prevReplyingTo)
      } finally {
        // Remover de la lista de pendientes al terminar (el re-fetch de mutateMessages traerá el definitivo)
        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    }
  }

  const pinnedMessages = allMessages.filter((m) => m.isPinned)

  // Build messages with date separators (Discord style layout)
  const renderMessages = () => {
    const elements: React.ReactNode[] = []

    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i]
      const prev = allMessages[i - 1]

      let parsedReactions: ReactionData[] = []
      if (msg.reactions) {
        try {
          parsedReactions = JSON.parse(msg.reactions)
        } catch {
          parsedReactions = []
        }
      }

      // Find referenced original reply message locally
      const replyOriginal = msg.replyToId
        ? allMessages.find((m) => m.id === msg.replyToId)
        : null

      // Parse reactions list

      elements.push(
        <div
          key={msg.id}
          id={`msg-card-${msg.id}`}
           className={`w-full select-none transition-all duration-300 ${msg.id < 0 ? 'animate-in fade-in duration-75' : ''} ${
            highlightedMessageId === msg.id ? 'bg-primary/10 ring-2 ring-primary/35 scale-[1.005] shadow-sm' : ''
          } ${msg.isPinned ? 'pinned-glow rounded-lg' : ''}`}
          onContextMenu={(e) => handleContextMenu(e, msg)}
        >
          {pinBurstId === msg.id && (
            <div className="pin-burst" />
          )}
          {/* Thread Reply Reference with Discord curved connection line */}
          {replyOriginal && (() => {
            let replyReactions: ReactionData[] = []
            if (replyOriginal.reactions) {
              try {
                replyReactions = JSON.parse(replyOriginal.reactions)
              } catch {
                replyReactions = []
              }
            }
            return (
              <div 
                onClick={() => handleJumpToMessage(replyOriginal.id)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pl-[52px] mb-0.5 max-w-[85%] hover:text-foreground cursor-pointer transition-colors group/reply"
              >
                <div className="w-6 h-2.5 border-t-2 border-l-2 border-border/80 rounded-tl-md mr-1.5 mt-2 shrink-0 group-hover/reply:border-primary/60 transition-colors" />
                <Reply className="size-3 shrink-0 text-muted-foreground/60 mr-0.5 group-hover/reply:text-primary transition-colors" />
                
                {/* Mini User Avatar (Discord style) */}
                {replyOriginal.senderImage ? (
                  <img
                    src={replyOriginal.senderImage}
                    alt=""
                    className="size-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[8.5px] font-bold text-primary select-none">
                    {replyOriginal.senderName ? replyOriginal.senderName[0].toUpperCase() : 'U'}
                  </span>
                )}

                <span className="font-semibold text-foreground/70 group-hover/reply:text-primary transition-colors">{replyOriginal.senderName}</span>
                <span className="truncate opacity-75 group-hover/reply:opacity-100 transition-opacity">{replyOriginal.content}</span>
                {replyReactions.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0 ml-1.5 bg-secondary/50 px-1 py-0.25 rounded text-[10px]">
                    {replyReactions.map((r) => r.emoji).join('')}
                  </div>
                )}
              </div>
            )
          })()}

          <div 
            className={`flex gap-3 items-start hover:bg-secondary/25 px-4 transition-all group relative ${{
                compact: 'py-1',
                normal: 'py-2.5',
                spacious: 'py-4',
              }[prefs.chatDensity]} ${
              editingMessage?.id === msg.id 
                ? 'bg-secondary/40 ring-1 ring-ring/30 rounded-lg' 
                : msg.replyToId 
                  ? 'bg-primary/[0.04] border-l-2 border-primary/40 rounded-lg pl-3.5' 
                  : 'rounded-lg'
            }`}
          >
            {/* Discord hover actions toolbar */}
            {msg.id >= 0 && (
              <div className="absolute right-4 -top-3.5 z-10 hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm h-8 px-1 py-0.5 animate-in fade-in zoom-in-95 duration-75">
                <div className="flex items-center gap-0.5">
                  {lastUsedEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => handleReact(msg.id, emoji, e)}
                      className="hover:bg-secondary rounded-md p-1 text-[13px] transition-transform hover:scale-110 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="w-px h-3 bg-border mx-0.5" />
                <button
                  onClick={() => {
                    setReplyingTo(msg)
                    setEditingMessage(null)
                    setTimeout(() => inputRef.current?.focus(), 50)
                  }}
                  className="hover:bg-secondary rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Responder"
                >
                  <Reply className="size-3.5" />
                </button>
                {msg.userId === user.id && (
                  <button
                    onClick={() => handleEditInit(msg)}
                    className="hover:bg-secondary rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    showContextMenu(rect.left - 200, rect.bottom + 5, msg)
                  }}
                  className="hover:bg-secondary rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Más opciones"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </div>
            )}
            {/* Avatar */}
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setPopoverUser({ id: msg.userId, name: msg.senderName, image: msg.senderImage })
                setPopoverAnchor(rect)
              }}
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              {msg.senderImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.senderImage || '/placeholder.svg'}
                  alt=""
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                initialsOf(msg.senderName)
              )}
            </button>

            {/* Content Area */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setPopoverUser({ id: msg.userId, name: msg.senderName, image: msg.senderImage })
                    setPopoverAnchor(rect)
                  }}
                  className="text-[13.5px] font-semibold hover:underline cursor-pointer text-foreground"
                >
                  {msg.senderName}
                </span>
                {prefs.showTimestamps && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatTime(msg.createdAt)}
                  </span>
                )}
                {/* Read receipt indicators - Circle check style */}
                {msg.userId === user.id && (() => {
                  // Mensaje pendiente (optimista, aún no guardado)
                  if (msg.id < 0) {
                    return (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground/50 ml-1" title="Enviando...">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )
                  }
                  
                  // Verificar si fue leído
                  let readByList: string[] = []
                  if (msg.readBy) {
                    try {
                      readByList = JSON.parse(msg.readBy)
                    } catch {
                      readByList = []
                    }
                  }
                  
                  // Filter out the sender from the readBy list
                  const othersWhoRead = readByList.filter(id => id !== user.id)
                  
                  // Estado 3: Leído (círculo con check azul)
                  if (othersWhoRead.length > 0) {
                    return (
                      <span 
                        className="inline-flex items-center gap-0.5 text-[#53bdeb] ml-1" 
                        title={`Leído por ${othersWhoRead.length} ${othersWhoRead.length === 1 ? 'persona' : 'personas'}`}
                      >
                        <IoCheckmarkCircleOutline className="size-4" />
                      </span>
                    )
                  }
                  
                  // Estado 2: Entregado pero no leído (círculo con check gris)
                  return (
                    <span 
                      className="inline-flex items-center gap-0.5 text-muted-foreground/60 ml-1" 
                      title="Entregado"
                    >
                      <IoCheckmarkCircleOutline className="size-4" />
                    </span>
                  )
                })()}
                {msg.isPinned && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUnpinConfirmMsg(msg) }}
                    className="inline-flex items-center hover:opacity-75 transition-opacity"
                    title="Unpin message"
                  >
                    <Pin className="size-3 text-primary rotate-45 shrink-0" />
                  </button>
                )}
              </div>

              {/* Message text content */}
              {(() => {
                const isForwarded = msg.content.startsWith('[Mensaje reenviado]:\n')
                const displayContent = isForwarded
                  ? msg.content.slice('[Mensaje reenviado]:\n'.length)
                  : msg.content

                if (isForwarded) {
                  return (
                    <div className="flex gap-2.5 mt-1.5">
                      {/* Borde izquierdo gris estilo Discord */}
                      <div className="w-[3px] bg-[#4e5058] rounded-full shrink-0 my-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {/* Etiqueta cursiva con flecha de reenvío */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#949ba4] font-medium italic select-none">
                          <Forward className="size-3 shrink-0" />
                          <span>Reenviado</span>
                        </div>
                        {/* Contenido textual del mensaje */}
                        <p className={`whitespace-pre-wrap leading-relaxed select-text ${
                          prefs.fontSize === 'small' ? 'text-xs text-foreground' : prefs.fontSize === 'large' ? 'text-base text-foreground' : 'text-[13px] text-foreground'
                        }`}>
                          {displayContent}
                        </p>
                      </div>
                    </div>
                  )
                }

                return (
                  <p className={`mt-0.5 whitespace-pre-wrap leading-relaxed select-text ${
                    prefs.fontSize === 'small' ? 'text-xs text-foreground' : prefs.fontSize === 'large' ? 'text-base text-foreground' : 'text-[13px] text-foreground'
                  }`}>
                    {msg.content}
                  </p>
                )
              })()}

              {parsedReactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parsedReactions.map((r) => {
                    const hasMyReaction = r.userIds
                      ? r.userIds.includes(user.id)
                      : r.usernames.some(
                          (name: string) => name.trim().toLowerCase() === user.name.trim().toLowerCase()
                        )
                    return (
                      <ReactionButton
                        key={r.emoji}
                        emoji={r.emoji}
                        count={r.usernames.length}
                        hasMyReaction={hasMyReaction}
                        onClick={(e) => handleReact(msg.id, r.emoji, e)}
                        title={`Reaccionado por: ${r.usernames.join(', ')}`}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
      )
    }

    return elements
  }

  const bubbleTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as const,
  }

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm ml-3">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="led shrink-0 text-success" aria-hidden style={{ animation: 'led-blink 2.4s ease-in-out infinite' }} />
          <span className="flex size-5 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground">
            #
          </span>
          <span className="truncate font-semibold">
            {conversation ? conversation.title : (lang === 'es' ? 'Nueva conversación' : 'New Conversation')}
          </span>
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setPinnedModalOpen(true)}
              className="ml-2 flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/15 rounded-full px-2 py-0.5 transition-opacity hover:opacity-90"
            >
              <Pin className="size-3 rotate-45" />
              <span>{pinnedMessages.length} {t.pinned}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground shrink-0 select-none">
          {/* Voice Call button */}
          {conversation?.isDirect && (
            <button
              onClick={() => handleStartCall('voice')}
              aria-label={lang === 'es' ? 'Iniciar llamada de voz' : 'Start Voice Call'}
              className="rounded-md p-1.5 transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Phone className="size-4.5" />
            </button>
          )}

          {/* Video Call button */}
          {conversation?.isDirect && (
            <button
              onClick={() => handleStartCall('video')}
              aria-label={lang === 'es' ? 'Iniciar videollamada' : 'Start Video Call'}
              className="rounded-md p-1.5 transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Video className="size-4.5" />
            </button>
          )}

          {/* Pinned Messages Button (Fully functional) */}
          <button
            ref={pinBtnRef}
            aria-label={lang === 'es' ? 'Mensajes fijados' : 'Pinned Messages'}
            aria-pressed={pinnedModalOpen}
            onClick={async () => {
              const opening = !pinnedModalOpen
              setPinnedModalOpen(opening)
              if (opening) {
                const unreadPinned = pinnedMessages.filter((m) => {
                  if (m.pinnedBy === user.id) return false
                  return !seenPinnedIds.has(m.id)
                })
                const unreadPinnedIds = unreadPinned.map((m) => m.id)
                if (unreadPinnedIds.length > 0) {
                  setGlowingPinnedIds(new Set(unreadPinnedIds))
                  await markMessagesAsRead(unreadPinnedIds, false)
                  mutateMessages()
                  setFadingPinnedIds(new Set(unreadPinnedIds))
                  setTimeout(() => {
                    setSeenPinnedIds((prev) => {
                      const next = new Set(prev)
                      unreadPinnedIds.forEach((id) => next.add(id))
                      return next
                    })
                    setGlowingPinnedIds(new Set())
                    setFadingPinnedIds(new Set())
                  }, 900)
                }
              } else {
                setGlowingPinnedIds(new Set())
                setFadingPinnedIds(new Set())
              }
            }}
            className={`relative rounded-md p-1.5 transition-colors hover:bg-secondary ${
              pinnedModalOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pin className="size-4.5 rotate-45" />
            {(() => {
              const count = pinnedMessages.filter((m) => {
                if (m.pinnedBy === user.id) return false
                return !seenPinnedIds.has(m.id)
              }).length
              return count > 0 ? (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
                  {count}
                </span>
              ) : null
            })()}
          </button>

          {/* Add User button */}
          <button
            aria-label={lang === 'es' ? 'Añadir miembros' : 'Add Members'}
            onClick={() => setAddMembersOpen(true)}
            className="rounded-md p-1.5 transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="size-4.5" />
          </button>


          {/* Channel Info / Members Panel (Fully functional) */}
          <button
            aria-label={t.channelInfo}
            aria-pressed={infoOpen}
            onClick={() => {
              onToggleInfo?.()
              setSearchOpen(false)
            }}
            className={`rounded-md p-1.5 transition-colors hover:bg-secondary ${
              infoOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info className="size-4.5" />
          </button>

          {/* Search Box positioned to the right of Info Button */}
          <div className="relative flex items-center bg-secondary rounded-lg px-2.5 h-7.5 w-36 hover:w-56 focus-within:w-56 transition-all duration-200 border border-border ml-1.5 shadow-sm">
            <Search className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
            <input
              type="text"
              placeholder={lang === 'es' ? `Buscar ${conversation ? conversation.title : ''}` : `Search ${conversation ? conversation.title : ''}`}
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground pr-5 text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-muted-foreground hover:text-foreground text-[10px] font-semibold"
              >
                {lang === 'es' ? 'Limpiar' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor principal del cuerpo (flex horizontal para soporte de panel de búsqueda) */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Lado izquierdo: Historial de mensajes y caja de chat */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="thin-scroll flex-1 overflow-y-auto px-5 py-4"
          >
            {!conversation && allMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                  <MessageSquarePlus className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.selectConversation}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {t.selectInstruction}
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="sr-only">{t.loadingMessages}</span>
              </div>
            ) : (
              <div className="flex min-h-full flex-col justify-end space-y-5">
                {allMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center py-20">
                    <p className="text-sm font-semibold text-muted-foreground">{t.noMessages}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {t.noMessagesInstruction}
                    </p>
                  </div>
                ) : (
                  renderMessages()
                )}
              </div>
            )}
          </div>

          {/* Typing Indicator - Discord style */}
          <div className="h-6 -mt-2 mb-1 shrink-0 relative px-6 pointer-events-none">
            <AnimatePresence mode="wait">
              {(typingUsers.length > 0 || debugTyping) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-0 left-6 flex items-center gap-2"
                >
                  <div className="flex items-center gap-1 mt-1">
                    <motion.span 
                      className="size-1.5 rounded-full bg-foreground/80" 
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} 
                      transition={{ ...bubbleTransition, delay: 0 }} 
                    />
                    <motion.span 
                      className="size-1.5 rounded-full bg-foreground/80" 
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} 
                      transition={{ ...bubbleTransition, delay: 0.15 }} 
                    />
                    <motion.span 
                      className="size-1.5 rounded-full bg-foreground/80" 
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} 
                      transition={{ ...bubbleTransition, delay: 0.3 }} 
                    />
                  </div>
                  <span className="text-[12px] text-foreground/90 font-medium tracking-wide">
                    {debugTyping ? (
                      <><strong className="font-bold text-foreground">Usuario de prueba</strong> {t.typing}</>
                    ) : typingUsers.length === 1 ? (
                      <><strong className="font-bold text-foreground">{typingUsers[0]}</strong> {t.typing}</>
                    ) : typingUsers.length === 2 ? (
                      <><strong className="font-bold text-foreground">{typingUsers[0]}</strong> {t.typingAnd} <strong className="font-bold text-foreground">{typingUsers[1]}</strong> {t.typingPlural}</>
                    ) : (
                      <><strong className="font-bold text-foreground">{typingUsers[0]}</strong> {t.typingAnd} <strong className="font-bold text-foreground">{typingUsers.length - 1} {t.typingOthers}</strong> {t.typingPlural}</>
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Discord-style Scroll to Bottom Alert badge (mockup match) */}
          <AnimatePresence>
            {showScrollToBottom && (
              <motion.div
                initial={{ opacity: 0, y: 12, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 12, x: '-50%' }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute bottom-[72px] left-1/2 z-20 flex items-center gap-3.5 bg-[#242528]/95 border border-[#1a1b1e]/50 pl-5 pr-1.5 py-0.5 rounded-full shadow-2xl backdrop-blur-sm select-none whitespace-nowrap"
              >
                <span className="text-[11.5px] text-[#dbdee1] font-medium tracking-wide whitespace-nowrap">
                  {t.olderMessagesAlert}
                </span>
                <button
                  onClick={handleScrollToBottom}
                  className="bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3c45a5] text-white text-[11px] font-semibold px-3 py-0 rounded-[5px] transition-colors select-none whitespace-nowrap"
                >
                  {t.jumpToPresent}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="px-5 pb-4 shrink-0">
            <div className="flex flex-col rounded-xl border border-border bg-background overflow-hidden shadow-sm">
              {/* AnimatePresence for smooth slide transitions of reply/edit banners */}
              <AnimatePresence initial={false}>
                {replyingTo && (() => {
                  let repReactions: ReactionData[] = []
                  if (replyingTo.reactions) {
                    try {
                      repReactions = JSON.parse(replyingTo.reactions)
                    } catch {
                      repReactions = []
                    }
                  }
                  return (
                    <motion.div
                      key="reply-banner"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="overflow-hidden bg-secondary/35"
                    >
                      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/70 text-[11.5px] select-none">
                        <span className="text-muted-foreground flex items-center gap-1.5 max-w-[85%] truncate">
                          <Reply className="size-3.5 shrink-0 text-muted-foreground/75" />
                          <span>{t.replyingTo}</span>
                          <strong className="font-semibold text-foreground">{replyingTo.senderName}</strong>
                          {repReactions.length > 0 && (
                            <span className="flex items-center gap-0.5 ml-2 bg-[#2b2d31]/50 border border-border/40 px-1 py-0.25 rounded shrink-0">
                              {repReactions.map(r => r.emoji).join('')}
                            </span>
                          )}
                        </span>
                        <button 
                          onClick={() => setReplyingTo(null)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })()}

                {editingMessage && (
                  <motion.div
                    key="edit-banner"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden bg-secondary/35"
                  >
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/70 text-[11.5px] select-none">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Pencil className="size-3.5 text-muted-foreground/75" />
                        <span>{t.editingMessage}</span>
                      </span>
                      <button 
                        onClick={handleCancelEdit}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Translator active indicator */}
              <AnimatePresence>
                {translateTarget && (
                  <motion.div
                    key="translate-banner"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/50 bg-gradient-to-r from-[#5865F2]/10 via-transparent to-transparent">
                      <span className="text-[10.5px] text-muted-foreground flex items-center gap-1.5 select-none">
                        <Languages className="size-3 text-[#5865F2]" />
                        <span>{t.translatorActive}</span>
                        <strong className="font-semibold text-[#5865F2]">
                          {translateTarget ? getLanguageName(translateTarget, lang) : ''}
                        </strong>
                        {translateTarget && (
                          <span className="text-[10px]">
                            {LANGUAGES.find((l) => l.code === translateTarget)?.flag}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setTranslateTarget(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="flex items-end gap-2 px-3 py-1.5">
                {/* Translator Button */}
                <div className="relative shrink-0 self-center">
                  <button
                    ref={translatorBtnRef}
                    onClick={() => {
                      const opening = !translatorMenuOpen
                      if (opening && translatorBtnRef.current) {
                        const rect = translatorBtnRef.current.getBoundingClientRect()
                        const menuHeight = 370
                        const menuWidth = 272

                        let top = rect.top - menuHeight - 8
                        let left = rect.left

                        if (top < 10) {
                          top = rect.bottom + 8
                        }
                        if (left + menuWidth > window.innerWidth) {
                          left = window.innerWidth - menuWidth - 10
                        }
                        if (left < 10) {
                          left = 10
                        }

                        setTranslatorMenuPos({ top, left })
                      }
                      setTranslatorMenuOpen(!translatorMenuOpen)
                      setLanguageSearch('')
                      if (opening) {
                        setTimeout(() => searchInputRef.current?.focus(), 100)
                      }
                    }}
                    title={t.translatorTooltip}
                    className={`flex items-center justify-center size-7 rounded-lg transition-all duration-200 ${
                      translateTarget
                        ? 'bg-[#5865F2]/15 text-[#5865F2] hover:bg-[#5865F2]/25 ring-1 ring-[#5865F2]/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Languages className="size-4" />
                  </button>

                  {/* Floating translator menu */}
                  <AnimatePresence>
                    {translatorMenuOpen && translatorMenuPos && (
                      <>
                        {/* Invisible backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => setTranslatorMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          style={{ top: translatorMenuPos.top, left: translatorMenuPos.left, maxHeight: 380 }}
                          className="fixed z-[70] w-68 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col"
                        >
                          {/* Search bar */}
                          <div className="px-3 pt-2.5 pb-2">
                            <div className="relative flex items-center bg-secondary rounded-lg px-2.5 h-7.5 border border-border shadow-sm">
                              <Search className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
                              <input
                                ref={searchInputRef}
                                type="text"
                                value={languageSearch}
                                onChange={(e) => setLanguageSearch(e.target.value)}
                                placeholder={t.translatorSearch}
                                className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground pr-5 text-foreground"
                              />
                            </div>
                          </div>

                          {/* Scrollable list */}
                          <div className="overflow-y-auto flex-1 px-1.5 pb-1.5 space-y-0.5 thin-scroll">
                            {/* Off */}
                            <button
                              onClick={() => {
                                setTranslateTarget(null)
                                setTranslatorMenuOpen(false)
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-all duration-150 ${
                                !translateTarget
                                  ? 'bg-secondary text-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                              }`}
                            >
                              <span className="flex items-center justify-center size-5 rounded-md bg-secondary/80 text-muted-foreground text-[10px] shrink-0">
                                ✕
                              </span>
                              <span>{t.translatorOff}</span>
                              {!translateTarget && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto size-1.5 rounded-full bg-muted-foreground/50"
                                />
                              )}
                            </button>

                            {/* Favorites section */}
                            {favorites.filter((c) => !languageSearch || getLanguageName(c, lang).toLowerCase().includes(languageSearch.toLowerCase())).length > 0 && (
                              <>
                                <div className="px-2.5 pt-1.5 pb-0.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t.translatorFavorites}
                                  </span>
                                </div>
                                {favorites
                                  .filter((c) => !languageSearch || getLanguageName(c, lang).toLowerCase().includes(languageSearch.toLowerCase()))
                                  .map((code) => {
                                    const language = LANGUAGES.find((l) => l.code === code)
                                    if (!language) return null
                                    const selected = translateTarget === code
                                    return (
                                      <button
                                        key={code}
                                        onClick={() => {
                                          setTranslateTarget(code)
                                          setTranslatorMenuOpen(false)
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-all duration-150 group ${
                                          selected
                                            ? 'bg-[#5865F2]/10 text-[#5865F2] font-medium ring-1 ring-[#5865F2]/20'
                                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                        }`}
                                      >
                                        <span className="flex items-center justify-center size-5 rounded-md text-[13px] shrink-0">
                                          {language.flag}
                                        </span>
                                        <span>{lang === 'es' ? language.nameEs : language.nameEn}</span>
                                        {selected && (
                                          <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="ml-auto size-1.5 rounded-full bg-[#5865F2]"
                                          />
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleFavorite(code)
                                          }}
                                          className="ml-auto shrink-0 p-0.5 rounded-md text-muted-foreground/40 hover:text-amber-400 transition-colors group-hover:opacity-100"
                                          title="Toggle favorite"
                                        >
                                          <Star className={`size-3 ${favorites.includes(code) ? 'fill-amber-400 text-amber-400' : ''}`} />
                                        </button>
                                      </button>
                                    )
                                  })}
                              </>
                            )}

                            {/* All languages section */}
                            {LANGUAGES.filter((l) => !languageSearch || l.nameEn.toLowerCase().includes(languageSearch.toLowerCase()) || l.nameEs.toLowerCase().includes(languageSearch.toLowerCase())).length > 0 && (
                              <>
                                <div className="px-2.5 pt-1.5 pb-0.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t.translatorAllLanguages}
                                  </span>
                                </div>
                                {LANGUAGES
                                  .filter((l) => !languageSearch || l.nameEn.toLowerCase().includes(languageSearch.toLowerCase()) || l.nameEs.toLowerCase().includes(languageSearch.toLowerCase()))
                                  .map((language) => {
                                    const selected = translateTarget === language.code
                                    return (
                                      <button
                                        key={language.code}
                                        onClick={() => {
                                          setTranslateTarget(language.code)
                                          setTranslatorMenuOpen(false)
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-all duration-150 group ${
                                          selected
                                            ? 'bg-[#5865F2]/10 text-[#5865F2] font-medium ring-1 ring-[#5865F2]/20'
                                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                        }`}
                                      >
                                        <span className="flex items-center justify-center size-5 rounded-md text-[13px] shrink-0">
                                          {language.flag}
                                        </span>
                                        <span>{lang === 'es' ? language.nameEs : language.nameEn}</span>
                                        {selected && (
                                          <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="ml-auto size-1.5 rounded-full bg-[#5865F2]"
                                          />
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleFavorite(language.code)
                                          }}
                                          className="ml-auto shrink-0 p-0.5 rounded-md text-muted-foreground/40 hover:text-amber-400 transition-colors group-hover:opacity-100"
                                          title="Toggle favorite"
                                        >
                                          <Star className={`size-3 ${favorites.includes(language.code) ? 'fill-amber-400 text-amber-400' : ''}`} />
                                        </button>
                                      </button>
                                    )
                                  })}
                              </>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      if (prefs.enterToSend) {
                        if (!e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      } else {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }
                    }
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
                  }}
                  placeholder={
                    translating ? t.translating :
                    editingMessage ? t.saveChanges :
                    replyingTo ? t.typeReply :
                    t.typeMessage
                  }
                  aria-label={t.typeMessage}
                  disabled={sending || translating}
                  rows={1}
                  className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground disabled:opacity-60 resize-none max-h-40 py-[7px]"
                />
              </div>
            </div>
          </footer>
        </div>

        {/* Lado derecho: Buscador Lateral */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-l border-border bg-card flex flex-col h-full shrink-0 overflow-hidden"
            >
              {/* Cabecera del Panel */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-bold text-[13px] text-foreground">{t.searchMessages}</span>
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    setSearchQuery('')
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-2">
                {!searchQuery.trim() ? (
                  <div className="text-center py-8 px-4">
                    <Search className="size-8 text-muted-foreground/35 mx-auto mb-2" />
                    <p className="text-[12px] text-muted-foreground leading-relaxed animate-pulse">
                      {t.searchInstructions}
                    </p>
                  </div>
                ) : (() => {
                  const query = searchQuery.trim().toLowerCase()
                  const results = allMessages.filter(
                    (m) => m.content && m.content.toLowerCase().includes(query)
                  )

                  if (results.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-[12px] text-muted-foreground">
                          {t.noMatches}
                        </p>
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className="text-[10px] font-semibold text-muted-foreground px-1 pb-1">
                        {results.length} {results.length === 1 ? t.match : t.matches}
                      </div>
                      {results.map((msg) => {
                        let msgReactions: ReactionData[] = []
                        if (msg.reactions) {
                          try {
                            msgReactions = JSON.parse(msg.reactions)
                          } catch {
                            msgReactions = []
                          }
                        }

                        const replyOriginal = msg.replyToId
                          ? allMessages.find((m) => m.id === msg.replyToId)
                          : null

                        return (
                          <div
                            key={msg.id}
                            onClick={() => handleJumpToMessage(msg.id)}
                            className="group hover:bg-secondary/60 active:bg-secondary border border-transparent hover:border-border/60 cursor-pointer rounded-lg p-2.5 transition-all text-left"
                          >
                            {replyOriginal && (
                              <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground/80 mb-1 max-w-full truncate">
                                <Reply className="size-2.5 shrink-0" />
                                <span>{t.replyingTo} </span>
                                <span className="font-semibold text-foreground/70 shrink-0">{replyOriginal.senderName}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-baseline mb-0.5">
                              <span className="font-semibold text-xs text-foreground/80 group-hover:text-primary">
                                {msg.senderName}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-foreground/70 leading-normal line-clamp-3 whitespace-pre-wrap select-none group-hover:text-foreground">
                              {msg.content}
                            </p>

                            {msgReactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {msgReactions.map((r) => (
                                  <div
                                    key={r.emoji}
                                    className="flex items-center gap-0.5 px-1 py-0.25 rounded bg-secondary border border-border/40 text-[9.5px] text-foreground/80"
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="font-medium">{r.usernames.length}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-60 rounded-xl border border-border bg-card p-1 shadow-2xl text-[13px] select-none text-foreground animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-1 border-b border-border/60 pb-1.5 mb-1 px-1 pt-0.5">
              {['🐱', '😄', '💯', '👍'].map((emoji) => (
                <button
                  key={emoji}
                  className="flex size-9 items-center justify-center rounded-lg hover:bg-secondary text-lg transition-transform hover:scale-110 active:scale-95"
                  onClick={() => {
                    handleReact(contextMenu.msg.id, emoji)
                    setContextMenu(null)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-0.5">
              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={(e) => handleOpenEmojiPicker(e, contextMenu.msg.id)}
              >
                <span>{t.addReaction}</span>
                <Smile className="size-3.5 text-muted-foreground" />
              </button>

              <button className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors" onClick={() => setContextMenu(null)}>
                <span>{t.viewReactions}</span>
                <Eye className="size-3.5 text-muted-foreground" />
              </button>

              <div className="h-px bg-border/60 my-1" />

              {contextMenu.msg.userId === user.id && (
                <button 
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                  onClick={() => {
                    handleEditInit(contextMenu.msg)
                    setContextMenu(null)
                  }}
                >
                  <span>{t.editMessageAction}</span>
                  <Pencil className="size-3.5 text-muted-foreground" />
                </button>
              )}

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  setReplyingTo(contextMenu.msg)
                  setEditingMessage(null)
                  setContextMenu(null)
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
              >
                <span>{t.replyAction}</span>
                <Reply className="size-3.5 text-muted-foreground" />
              </button>

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  setForwardedStatus({})
                  setForwardingMsg(contextMenu.msg)
                  setContextMenu(null)
                }}
              >
                <span>{t.forwardAction}</span>
                <Forward className="size-3.5 text-muted-foreground" />
              </button>

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  handleCopyText(contextMenu.msg.content)
                  setContextMenu(null)
                }}
              >
                <span>{t.copyTextAction}</span>
                <Copy className="size-3.5 text-muted-foreground" />
              </button>

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  if (contextMenu.msg.isPinned) {
                    setUnpinConfirmMsg(contextMenu.msg)
                  } else {
                    setPinConfirmMsg(contextMenu.msg)
                  }
                  setContextMenu(null)
                }}
              >
                <span>{contextMenu.msg.isPinned ? t.unpinMessageAction : t.pinMessageAction}</span>
                <Pin className="size-3.5 text-muted-foreground" />
              </button>

              <button className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors" onClick={() => setContextMenu(null)}>
                <span>{lang === 'es' ? 'Marcar mensaje' : 'Mark Message'}</span>
                <Compass className="size-3.5 text-muted-foreground" />
              </button>

              <button className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors" onClick={() => setContextMenu(null)}>
                <span>{lang === 'es' ? 'Marcar no leídos' : 'Mark Unread'}</span>
                <Compass className="size-3.5 text-muted-foreground" />
              </button>

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  handleCopyText(`${window.location.origin}/?conv=${conversation?.id}&msg=${contextMenu.msg.id}`)
                  setContextMenu(null)
                }}
              >
                <span>{lang === 'es' ? 'Copiar enlace del mensaje' : 'Copy Message Link'}</span>
                <Compass className="size-3.5 text-muted-foreground" />
              </button>

              <button 
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary text-left text-foreground/90 transition-colors"
                onClick={() => {
                  handleSpeakMessage(contextMenu.msg.content)
                  setContextMenu(null)
                }}
              >
                <span>{t.speakMessageAction}</span>
                <Volume2 className="size-3.5 text-muted-foreground" />
              </button>

              {contextMenu.msg.userId === user.id && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <button 
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-destructive/10 text-destructive text-left font-medium transition-colors"
                    onClick={(e) => {
                      if (e.shiftKey) {
                        handleDeleteMessage(contextMenu.msg.id)
                      } else {
                        setDeletingMessageConfirm(contextMenu.msg)
                      }
                      setContextMenu(null)
                    }}
                  >
                    <span>{t.deleteMessageAction}</span>
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forwardingMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1.5px]" onClick={() => setForwardingMsg(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[420px] rounded-[5px] border border-[#2b2d31] bg-[#313338] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#2b2d31] pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-[18px] text-white leading-tight">Reenviar</h3>
                  <p className="text-[11.5px] text-[#949ba4] mt-0.5">Comparte este mensaje con otras conversaciones.</p>
                </div>
                <button 
                  onClick={() => setForwardingMsg(null)} 
                  className="rounded p-1 hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Vista previa del mensaje - Estilo Discord */}
              <div className="mb-4 bg-[#1e1f22] border border-[#2b2d31] rounded-[4px] p-3 text-left">
                <div className="flex gap-3 items-start relative">
                  {/* Avatar real o inicial */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary text-sm font-semibold select-none">
                    {forwardingMsg.senderName ? forwardingMsg.senderName[0].toUpperCase() : 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-[13px] font-medium text-[#f2f3f5] hover:underline cursor-pointer">
                        {forwardingMsg.senderName}
                      </span>
                      <span className="text-[9.5px] text-[#949ba4]">
                        {formatTime(forwardingMsg.createdAt)}
                      </span>
                    </div>

                    <p className="text-[13px] text-[#dbdee1] leading-relaxed wrap-break-word whitespace-pre-wrap select-text">
                      {forwardingMsg.content}
                    </p>

                    {/* Reacciones de la vista previa de reenvío */}
                    {(() => {
                      let fwdReactions: ReactionData[] = []
                      if (forwardingMsg.reactions) {
                        try {
                          fwdReactions = JSON.parse(forwardingMsg.reactions)
                        } catch {
                          fwdReactions = []
                        }
                      }
                      if (fwdReactions.length === 0) return null
                      return (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {fwdReactions.map((r) => (
                            <div
                              key={r.emoji}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#2b2d31] border border-[#3f4147] text-[11px] text-[#dbdee1]"
                            >
                              <span>{r.emoji}</span>
                              <span className="font-semibold text-[10px] text-[#b5bac1]">{r.usernames.length}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Listado de Chats */}
              <div className="space-y-2 max-h-56 overflow-y-auto thin-scroll pr-1">
                {allConversations.length === 0 ? (
                  <p className="text-[12px] text-[#949ba4] py-6 text-center select-none">No hay otros chats disponibles.</p>
                ) : (
                  allConversations.map((c) => {
                    const isSent = !!forwardedStatus[c.id]
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-[4px] hover:bg-[#35373c] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[#949ba4] font-semibold text-sm">#</span>
                          <span className="text-[13px] text-[#dbdee1] font-medium truncate select-none">
                            {c.title}
                          </span>
                        </div>

                        {isSent ? (
                          <div className="bg-[#248046] text-white text-[11px] font-semibold px-4 py-1.5 rounded-[3px] flex items-center gap-1 select-none cursor-default">
                            <span>✓</span>
                            <span>{t.sent}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleForwardMessage(c.id)}
                            className="bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3c45a5] text-white text-[11px] font-semibold px-4 py-1.5 rounded-[3px] transition-colors select-none"
                          >
                            {t.send}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Popover (Discord Style dropdown) */}
      <AnimatePresence>
        {pinnedModalOpen && (
          <div 
            className="absolute right-4 top-14 z-50 w-full max-w-[420px] rounded-lg border border-border bg-popover text-popover-foreground p-4 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-150 select-none text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border">
              <Pin className="size-4 text-muted-foreground" />
              <h3 className="font-bold text-[14px] text-foreground">
                {lang === 'es' ? 'Mensajes fijados' : 'Pinned Messages'}
              </h3>
            </div>

            {/* Popover Body */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto thin-scroll pr-1">
              {pinnedMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {lang === 'es' ? 'No hay mensajes fijados en este chat.' : 'No pinned messages in this chat.'}
                </p>
              ) : (
                pinnedMessages.map((m) => {
                  let parsedReactions: ReactionData[] = []
                  if (m.reactions) {
                    try {
                      parsedReactions = JSON.parse(m.reactions)
                    } catch {
                      parsedReactions = []
                    }
                  }

                  const replyOriginal = m.replyToId
                    ? allMessages.find((orig) => orig.id === m.replyToId)
                    : null

                  return (
                    <div 
                      key={m.id} 
                      onClick={() => {
                        handleJumpToMessage(m.id)
                        setPinnedModalOpen(false)
                      }}
                      className={`group relative flex flex-col gap-1.5 p-3 rounded-md bg-secondary/30 border border-border/80 hover:bg-secondary/60 transition-colors text-left ${glowingPinnedIds.has(m.id) ? `pinned-glow ${fadingPinnedIds.has(m.id) ? 'pinned-glow-fade' : ''}` : ''}`}
                    >
                      {/* Thread Reply Reference */}
                      {replyOriginal && (() => {
                        const isReplyForwarded = replyOriginal.content.startsWith('[Mensaje reenviado]:\n')
                        const replyDisplay = isReplyForwarded
                          ? replyOriginal.content.slice('[Mensaje reenviado]:\n'.length)
                          : replyOriginal.content

                        return (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/75 border-l border-border/60 pl-2 mb-0.5 truncate">
                            <Reply className="size-2.5 shrink-0" />
                            <span>{lang === 'es' ? 'Respondiendo a' : 'Replying to'}</span>
                            {replyOriginal.senderImage ? (
                              <img
                                src={replyOriginal.senderImage}
                                alt=""
                                className="size-3.5 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[7px] font-bold text-primary select-none">
                                {initialsOf(replyOriginal.senderName)}
                              </span>
                            )}
                            <span className="font-semibold text-foreground/70">{replyOriginal.senderName}</span>
                            <span className="truncate italic opacity-85">"{replyDisplay}"</span>
                          </div>
                        )
                      })()}

                      <div className="flex gap-3 items-start w-full">
                        {/* Avatar */}
                        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground mt-0.5">
                          {m.senderImage ? (
                            <img
                              src={m.senderImage}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            initialsOf(m.senderName)
                          )}
                        </span>

                        {/* Body Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[13px] font-semibold text-foreground">
                              {m.senderName}
                            </span>
                            <span className="text-[9.5px] text-muted-foreground">
                              {formatTime(m.createdAt)}
                            </span>
                          </div>
                          
                          {/* Message text content */}
                          {(() => {
                            const isForwarded = m.content.startsWith('[Mensaje reenviado]:\n')
                            const displayContent = isForwarded
                              ? m.content.slice('[Mensaje reenviado]:\n'.length)
                              : m.content

                            if (isForwarded) {
                              return (
                                <div className="flex gap-2 mt-1">
                                  <div className="w-[2.5px] bg-[#4e5058] rounded-full shrink-0 my-0.5" />
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic select-none">
                                      <Forward className="size-3 shrink-0" />
                                      <span>{lang === 'es' ? 'Reenviado' : 'Forwarded'}</span>
                                    </div>
                                    <p className="text-foreground/90 text-[12px] whitespace-pre-wrap select-text pr-5 leading-normal">
                                      {displayContent}
                                    </p>
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <p className="text-foreground/90 text-[12px] whitespace-pre-wrap select-text pr-5 leading-normal">
                                {m.content}
                              </p>
                            )
                          })()}

                          {/* Reactions inside the pinned card */}
                          {parsedReactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {parsedReactions.map((r) => (
                                <div
                                  key={r.emoji}
                                  className="flex items-center gap-1 px-1.5 py-0.25 rounded-[4px] bg-secondary/50 border border-border text-[11px] select-none text-foreground/80"
                                >
                                  <span>{r.emoji}</span>
                                  <span className="font-bold text-[9.5px] text-muted-foreground">{r.usernames.length}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons: Ir + X */}
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleJumpToMessage(m.id)
                              setPinnedModalOpen(false)
                            }}
                            className="px-2.5 py-1 rounded-[4px] bg-secondary/60 hover:bg-secondary border border-border/60 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors select-none"
                          >
                            {lang === 'es' ? 'Ir' : 'Go'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnpinConfirmMsg(m)
                            }}
                            className="p-1.5 rounded-[4px] bg-secondary/60 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-destructive transition-colors"
                            title={lang === 'es' ? 'Desfijar' : 'Unpin'}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* --- Emoji Picker Popover --- */}
      <AnimatePresence>
        {emojiPicker && (
          <div 
            className="fixed z-50 shadow-2xl rounded-xl overflow-hidden border border-border"
            style={{ top: emojiPicker.y, left: emojiPicker.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              theme={"dark" as any}
              onEmojiClick={(emojiData) => {
                handleReact(emojiPicker.msgId, emojiData.emoji)
                setEmojiPicker(null)
              }}
            />
          </div>
        )}
      </AnimatePresence>
      {/* Backdrop transparente para cerrar menús y selectores de forma segura */}
      {(contextMenu || emojiPicker || pinnedModalOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={(e) => {
            e.stopPropagation()
            setContextMenu(null)
            setEmojiPicker(null)
            setPinnedModalOpen(false)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setContextMenu(null)
            setEmojiPicker(null)
            setPinnedModalOpen(false)
          }}
        />
      )}

      {/* --- Discord-style Delete Message Confirmation Modal --- */}
      <AnimatePresence>
        {deletingMessageConfirm && (() => {
          let previewReactions: ReactionData[] = []
          if (deletingMessageConfirm.reactions) {
            try {
              previewReactions = JSON.parse(deletingMessageConfirm.reactions)
            } catch {
              previewReactions = []
            }
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-[440px] rounded-lg bg-[#313338] text-foreground p-4 shadow-2xl relative border border-border/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close X Button */}
                <button
                  onClick={() => setDeletingMessageConfirm(null)}
                  className="absolute top-4 right-4 text-[#b5bac1] hover:text-white transition-colors p-1"
                >
                  <X className="size-5" />
                </button>

                {/* Header */}
                <h3 className="text-[20px] font-bold text-white leading-tight mb-2 pr-6">
                  {t.deleteTitle}
                </h3>
                <p className="text-[13.5px] text-[#dbdee1] leading-normal mb-4">
                  {t.deleteWarning}
                </p>

                {/* Message Preview Container */}
                <div className="bg-[#1e1f22] rounded-md p-4 mb-4 border border-[#111214]/40 flex gap-3 items-start shadow-inner select-text">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground mt-0.5">
                    {deletingMessageConfirm.senderImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={deletingMessageConfirm.senderImage}
                        alt=""
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      initialsOf(deletingMessageConfirm.senderName)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground/90">
                        {deletingMessageConfirm.senderName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(deletingMessageConfirm.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {deletingMessageConfirm.content}
                    </p>

                    {/* Reactions list inside preview */}
                    {previewReactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {previewReactions.map((r) => {
                          const hasMyReaction = r.userIds
                            ? r.userIds.includes(user.id)
                            : r.usernames.some(
                                (name) => name.trim().toLowerCase() === user.name.trim().toLowerCase()
                              )
                          return (
                            <div
                              key={r.emoji}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border h-6 select-none ${
                                hasMyReaction
                                  ? 'bg-primary/10 border-primary/50 text-primary font-medium'
                                  : 'bg-secondary border-border text-foreground'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span>{r.usernames.length}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Advice Section */}
                <div className="mb-6 text-[12px] leading-relaxed text-[#dbdee1]">
                  <span className="text-[#23a55a] font-bold uppercase tracking-wider block mb-1">
                    {lang === 'es' ? 'CONSEJO:' : 'PRO-TIP:'}
                  </span>
                  <p>
                    {lang === 'es' 
                      ? 'Puedes mantener pulsado Mayús cuando hagas clic en eliminar mensaje para ignorar esta confirmación por completo.' 
                      : 'You can hold Shift when clicking delete message to bypass this confirmation modal entirely.'}
                  </p>
                </div>

                {/* Buttons Footer */}
                <div className="flex items-center justify-end gap-3 bg-[#2b2d31] -mx-4 -mb-4 p-4 rounded-b-lg border-t border-[#1e1f22]/50">
                  <button
                    onClick={() => setDeletingMessageConfirm(null)}
                    className="px-5 py-2 text-[#dbdee1] hover:text-white hover:underline text-[13px] font-medium transition-colors select-none"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteMessage(deletingMessageConfirm.id)
                      setDeletingMessageConfirm(null)
                    }}
                    className="px-6 py-2 bg-[#f23f43] hover:bg-[#da373c] active:bg-[#a92b2f] text-white text-[13.5px] font-semibold rounded-[4px] transition-colors shadow-sm select-none"
                  >
                    {t.deleteBtn}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
      {/* --- Pin Confirmation Modal --- */}
      <AnimatePresence>
        {pinConfirmMsg && (() => {
          let previewReactions: ReactionData[] = []
          if (pinConfirmMsg.reactions) {
            try {
              previewReactions = JSON.parse(pinConfirmMsg.reactions)
            } catch {
              previewReactions = []
            }
          }
          const isForwarded = pinConfirmMsg.content.startsWith('[Mensaje reenviado]:\n')
          const displayContent = isForwarded
            ? pinConfirmMsg.content.slice('[Mensaje reenviado]:\n'.length)
            : pinConfirmMsg.content

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-[440px] rounded-lg bg-popover text-popover-foreground p-4 shadow-2xl relative border border-border/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close X Button */}
                <button
                  onClick={() => setPinConfirmMsg(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="size-5" />
                </button>

                {/* Header */}
                <h3 className="text-[20px] font-bold text-foreground leading-tight mb-4 pr-6">
                  {lang === 'es' ? 'Fíjalo. Fíjalo bien.' : 'Pin It. Pin It Good.'}
                </h3>

                {/* Message Preview Container */}
                <div className="bg-secondary/30 rounded-md p-4 mb-5 border border-border/40 flex gap-3 items-start shadow-inner select-text">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground mt-0.5">
                    {pinConfirmMsg.senderImage ? (
                      <img src={pinConfirmMsg.senderImage} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      initialsOf(pinConfirmMsg.senderName)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground/90">{pinConfirmMsg.senderName}</span>
                      <span className="text-[11px] text-muted-foreground">{formatTime(pinConfirmMsg.createdAt)}</span>
                    </div>
                    {isForwarded ? (
                      <div className="flex gap-2 mt-1">
                        <div className="w-[2.5px] bg-[#4e5058] rounded-full shrink-0 my-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic select-none">
                            <Forward className="size-3 shrink-0" />
                            <span>{lang === 'es' ? 'Reenviado' : 'Forwarded'}</span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{displayContent}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{pinConfirmMsg.content}</p>
                    )}
                    {previewReactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {previewReactions.map((r) => (
                          <div key={r.emoji} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border h-6 select-none bg-secondary border-border text-foreground">
                            <span>{r.emoji}</span>
                            <span>{r.usernames.length}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons Footer */}
                <div className="flex items-center justify-end gap-3 bg-secondary/30 -mx-4 -mb-4 p-4 rounded-b-lg border-t border-border/50">
                  <button
                    onClick={() => setPinConfirmMsg(null)}
                    className="px-5 py-2 text-muted-foreground hover:text-foreground hover:underline text-[13px] font-medium transition-colors select-none"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={() => {
                      handleTogglePin(pinConfirmMsg.id)
                      setPinConfirmMsg(null)
                    }}
                    className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3c45a5] text-white text-[13.5px] font-semibold rounded-[4px] transition-colors shadow-sm select-none"
                  >
                    {lang === 'es' ? 'Oh, sí. Fíjalo' : 'Oh yeah. Pin it'}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* --- Unpin Confirmation Modal --- */}
      <AnimatePresence>
        {unpinConfirmMsg && (() => {
          const isForwarded = unpinConfirmMsg.content.startsWith('[Mensaje reenviado]:\n')
          const displayContent = isForwarded
            ? unpinConfirmMsg.content.slice('[Mensaje reenviado]:\n'.length)
            : unpinConfirmMsg.content

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-[440px] rounded-lg bg-popover text-popover-foreground p-4 shadow-2xl relative border border-border/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close X Button */}
                <button
                  onClick={() => setUnpinConfirmMsg(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="size-5" />
                </button>

                {/* Header */}
                <h3 className="text-[20px] font-bold text-foreground leading-tight mb-1 pr-6">
                  {lang === 'es' ? 'Retirar mensaje' : 'Unpin Message'}
                </h3>
                <p className="text-[13.5px] text-muted-foreground leading-normal mb-4">
                  {lang === 'es' ? '¿Seguro que quieres eliminar este mensaje fijado?' : 'Are you sure you want to unpin this message?'}
                </p>

                {/* Message Preview Container */}
                <div className="bg-secondary/30 rounded-md p-4 mb-5 border border-border/40 flex gap-3 items-start shadow-inner select-text">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground mt-0.5">
                    {unpinConfirmMsg.senderImage ? (
                      <img src={unpinConfirmMsg.senderImage} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      initialsOf(unpinConfirmMsg.senderName)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground/90">{unpinConfirmMsg.senderName}</span>
                      <span className="text-[11px] text-muted-foreground">{formatTime(unpinConfirmMsg.createdAt)}</span>
                    </div>
                    {isForwarded ? (
                      <div className="flex gap-2 mt-1">
                        <div className="w-[2.5px] bg-[#4e5058] rounded-full shrink-0 my-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic select-none">
                            <Forward className="size-3 shrink-0" />
                            <span>{lang === 'es' ? 'Reenviado' : 'Forwarded'}</span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{displayContent}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{unpinConfirmMsg.content}</p>
                    )}
                  </div>
                </div>

                {/* Buttons Footer */}
                <div className="flex items-center justify-end gap-3 bg-secondary/30 -mx-4 -mb-4 p-4 rounded-b-lg border-t border-border/50">
                  <button
                    onClick={() => setUnpinConfirmMsg(null)}
                    className="px-5 py-2 text-muted-foreground hover:text-foreground hover:underline text-[13px] font-medium transition-colors select-none"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={() => {
                      handleTogglePin(unpinConfirmMsg.id)
                      setUnpinConfirmMsg(null)
                    }}
                    className="px-6 py-2 bg-[#f23f43] hover:bg-[#da373c] active:bg-[#a92b2f] text-white text-[13.5px] font-semibold rounded-[4px] transition-colors shadow-sm select-none"
                  >
                    {lang === 'es' ? '¡Elimínalo!' : 'Remove it!'}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {conversation && (
        <AddMembersModal
          open={addMembersOpen}
          onClose={() => setAddMembersOpen(false)}
          conversationId={conversation.id}
          onMembersAdded={() => {
            onConversationInfoChange?.(conversation.id)
          }}
        />
      )}

      {/* User popover */}
      {popoverUser && popoverAnchor && (
        <UserPopover
          user={popoverUser}
          currentUserId={user.id}
          anchorRect={popoverAnchor}
          onClose={() => { setPopoverUser(null); setPopoverAnchor(null) }}
          onOpenFullProfile={() => {
            setProfileModalUser(popoverUser)
            setPopoverUser(null)
            setPopoverAnchor(null)
          }}
        />
      )}

      {/* Full profile modal */}
      {profileModalUser && (
        <UserProfileModal
          user={profileModalUser}
          currentUserId={user.id}
          onClose={() => setProfileModalUser(null)}
        />
      )}

    </section>
  )
}
