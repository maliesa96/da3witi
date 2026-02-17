"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Loader2,
  ShieldX,
  RefreshCw,
  User,
  Check,
  CheckCheck,
  Search,
  ChevronLeft,
  Wifi,
  WifiOff,
  Clock,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Conversation = {
  phone: string;
  guestName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastDirection: string;
  lastInboundAt: string | null;
  unreadCount: number;
  totalCount: number;
};

type Message = {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  body: string;
  messageType: string;
  whatsappMessageId: string | null;
  contextMessageId: string | null;
  guestId: string | null;
  guestName: string | null;
  status: string;
  needsReply: boolean;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPhone(phone: string): string {
  if (phone.length > 8) {
    return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 9)} ${phone.slice(9)}`;
  }
  return phone;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Map<string, Message[]> = new Map();
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    let label: string;
    if (isToday) label = "Today";
    else if (isYesterday) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(msg);
  }
  return Array.from(groups.entries()).map(([date, messages]) => ({ date, messages }));
}

/* ------------------------------------------------------------------ */
/*  24h window helpers                                                 */
/* ------------------------------------------------------------------ */

type WindowStatus =
  | { open: true; remaining: string; urgency: "ok" | "warning" | "critical" }
  | { open: false; remaining: null; urgency: "closed" };

function get24hWindowStatus(lastInboundAt: string | null): WindowStatus {
  if (!lastInboundAt) return { open: false, remaining: null, urgency: "closed" };

  const elapsed = Date.now() - new Date(lastInboundAt).getTime();
  const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;
  const remainingMs = TWENTY_FOUR_H - elapsed;

  if (remainingMs <= 0) return { open: false, remaining: null, urgency: "closed" };

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / 60_000);

  let remaining: string;
  if (hours > 0) remaining = `${hours}h ${mins}m`;
  else remaining = `${mins}m`;

  let urgency: "ok" | "warning" | "critical";
  if (remainingMs > 4 * 60 * 60 * 1000) urgency = "ok";
  else if (remainingMs > 1 * 60 * 60 * 1000) urgency = "warning";
  else urgency = "critical";

  return { open: true, remaining, urgency };
}

/* ------------------------------------------------------------------ */
/*  useWhatsAppRealtime hook                                           */
/* ------------------------------------------------------------------ */

function useWhatsAppRealtime(onMessage: (msg: Message) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onMessage);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    callbackRef.current = onMessage;
  });

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();
    const channelName = "whatsapp:admin";

    const channel = supabase
      .channel(channelName)
      .on(
        "broadcast",
        { event: "whatsapp:message" },
        (message: { payload: Message }) => {
          if (!isActive) return;
          callbackRef.current(message.payload);
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (!isActive) return;
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Connected to ${channelName}`);
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] Channel error:`, err?.message || err);
          setIsConnected(false);
        } else if (status === "TIMED_OUT") {
          console.warn(`[Realtime] Connection timed out`);
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      isActive = false;
      setIsConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  return { isConnected };
}

/* ------------------------------------------------------------------ */
/*  StatusIcon                                                         */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: string }) {
  if (status === "read") return <CheckCheck size={14} className="text-blue-500" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-stone-400" />;
  if (status === "sent") return <Check size={14} className="text-stone-400" />;
  return null;
}

/* ------------------------------------------------------------------ */
/*  ConversationList                                                   */
/* ------------------------------------------------------------------ */

function ConversationList({
  conversations,
  selectedPhone,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  conversations: Conversation[];
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filtered = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.phone.includes(q) ||
      c.guestName?.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-stone-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-stone-100 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-green-500/30 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-sm text-stone-400 gap-2">
            <MessageCircle size={24} />
            <span>No conversations yet</span>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.phone}
              onClick={() => onSelect(conv.phone)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 cursor-pointer ${
                selectedPhone === conv.phone
                  ? "bg-green-50 border-r-2 border-green-500"
                  : "border-r-2 border-transparent"
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
                {conv.guestName ? conv.guestName.charAt(0).toUpperCase() : <User size={18} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-stone-900 truncate">
                    {conv.guestName || formatPhone(conv.phone)}
                  </span>
                  <span className="text-[11px] text-stone-400 whitespace-nowrap shrink-0">
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-stone-500 truncate">
                    {conv.lastDirection === "outbound" && (
                      <span className="text-stone-400">You: </span>
                    )}
                    {conv.lastMessage}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                {conv.guestName && (
                  <span className="text-[11px] text-stone-400 mt-0.5 block">
                    {formatPhone(conv.phone)}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                      */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1`}
    >
      <div
        className={`relative max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isOutbound
            ? "bg-green-600 text-white rounded-br-md"
            : "bg-white text-stone-900 rounded-bl-md shadow-sm border border-stone-100"
        }`}
      >
        {/* Guest name badge for inbound */}
        {!isOutbound && message.guestName && (
          <div className="text-[11px] font-semibold text-green-600 mb-0.5">
            {message.guestName}
          </div>
        )}

        {/* Message body */}
        <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>

        {/* Timestamp + status */}
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOutbound ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isOutbound ? "text-green-200" : "text-stone-400"
            }`}
          >
            {formatTimestamp(message.createdAt)}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>

        {/* Bubble tail */}
        <div
          className={`absolute bottom-0 w-3 h-3 ${
            isOutbound
              ? "right-[-4px] bg-green-600"
              : "left-[-4px] bg-white border-l border-b border-stone-100"
          }`}
          style={{
            clipPath: isOutbound
              ? "polygon(0 0, 0 100%, 100% 100%)"
              : "polygon(100% 0, 0 100%, 100% 100%)",
          }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatView                                                           */
/* ------------------------------------------------------------------ */

function ChatView({
  phone,
  conversations,
  messages,
  onBack,
}: {
  phone: string;
  conversations: Conversation[];
  messages: Message[];
  onBack: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conv = conversations.find((c) => c.phone === phone);
  const displayName = conv?.guestName || formatPhone(phone);

  // 24h window status - re-compute every minute
  const [windowStatus, setWindowStatus] = useState<WindowStatus>(() =>
    get24hWindowStatus(conv?.lastInboundAt ?? null)
  );

  useEffect(() => {
    const update = () => setWindowStatus(get24hWindowStatus(conv?.lastInboundAt ?? null));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [conv?.lastInboundAt]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [phone]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");

    try {
      await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, message: text }),
      });
      // Message will appear via Supabase Realtime broadcast
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-stone-100 text-stone-900 border-b border-stone-200 shadow-sm">
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-full bg-stone-300 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {conv?.guestName ? conv.guestName.charAt(0).toUpperCase() : <User size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <p className="text-[11px] text-stone-500 truncate">
            {conv?.guestName ? formatPhone(phone) : ""}
          </p>
        </div>
        {/* 24h window badge */}
        {windowStatus.open ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              windowStatus.urgency === "ok"
                ? "bg-emerald-100 text-emerald-700"
                : windowStatus.urgency === "warning"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
            title="Freeform messaging window is open"
          >
            <Clock size={12} />
            {windowStatus.remaining}
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-200 text-stone-500"
            title="24h window closed — only template messages allowed"
          >
            <Lock size={12} />
            Closed
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d6d3d1' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "#f0ebe3",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-2">
            <MessageCircle size={32} />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-[11px] text-stone-500 shadow-sm font-medium">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 24h window banner */}
      {!windowStatus.open && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs">
          <Lock size={12} className="shrink-0" />
          <span>
            24h messaging window closed. Only template messages can be sent until
            the customer messages again.
          </span>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-stone-200 bg-stone-50 px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              windowStatus.open
                ? "Type a message..."
                : "Window closed — template messages only"
            }
            rows={1}
            className="flex-1 resize-none py-2.5 px-4 text-sm bg-white rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 placeholder:text-stone-400 max-h-32"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
        <MessageCircle size={32} />
      </div>
      <p className="text-sm font-medium">Select a conversation</p>
      <p className="text-xs text-stone-400">
        Choose a chat from the sidebar to view messages
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WhatsAppChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const selectedPhoneRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/conversations", {
        credentials: "include",
      });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a specific phone on first open
  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await fetch(
        `/api/admin/whatsapp/messages?phone=${encodeURIComponent(phone)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data: Message[] = await res.json();
        setAllMessages((prev) => new Map(prev).set(phone, data));
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, []);

  // Handle realtime message broadcast
  const handleRealtimeMessage = useCallback(
    (msg: Message) => {
      // If this message is for the currently open conversation, auto-mark as read
      const isViewing = selectedPhoneRef.current === msg.phone;

      // Add message to the appropriate conversation's message list
      setAllMessages((prev) => {
        const next = new Map(prev);
        const existing = next.get(msg.phone) || [];
        // Deduplicate by id
        if (existing.some((m) => m.id === msg.id)) return prev;
        next.set(msg.phone, [...existing, msg]);
        return next;
      });

      // Update conversation list in place
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.phone === msg.phone);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: msg.body,
            lastMessageAt: msg.createdAt,
            lastDirection: msg.direction,
            lastInboundAt:
              msg.direction === "inbound"
                ? msg.createdAt
                : updated[idx].lastInboundAt,
            totalCount: updated[idx].totalCount + 1,
            // Only increment unread if needsReply AND not currently viewing this chat
            unreadCount:
              msg.needsReply && !isViewing
                ? updated[idx].unreadCount + 1
                : updated[idx].unreadCount,
            guestName: msg.guestName || updated[idx].guestName,
          };
          // Re-sort: most recent first
          updated.sort(
            (a, b) =>
              new Date(b.lastMessageAt).getTime() -
              new Date(a.lastMessageAt).getTime()
          );
          return updated;
        }
        // New conversation
        return [
          {
            phone: msg.phone,
            guestName: msg.guestName,
            lastMessage: msg.body,
            lastMessageAt: msg.createdAt,
            lastDirection: msg.direction,
            lastInboundAt: msg.direction === "inbound" ? msg.createdAt : null,
            unreadCount: msg.needsReply && !isViewing ? 1 : 0,
            totalCount: 1,
          },
          ...prev,
        ];
      });

      // If viewing this chat and the message needs a reply, mark it read on the server
      if (isViewing && msg.needsReply) {
        fetch("/api/admin/whatsapp/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone: msg.phone }),
        }).catch(() => {});
      }
    },
    []
  );

  // Subscribe to Supabase Realtime
  const { isConnected } = useWhatsAppRealtime(handleRealtimeMessage);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Mark all needsReply messages as read for a conversation
  const markAsRead = useCallback(async (phone: string) => {
    // Clear unread count locally immediately
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.phone === phone);
      if (idx < 0 || prev[idx].unreadCount === 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], unreadCount: 0 };
      return updated;
    });

    // Persist to server
    try {
      await fetch("/api/admin/whatsapp/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, []);

  // When selecting a conversation, fetch its messages if not already loaded
  const handleSelectPhone = useCallback(
    (phone: string) => {
      setSelectedPhone(phone);
      selectedPhoneRef.current = phone;
      if (!allMessages.has(phone)) {
        fetchMessages(phone);
      }
      markAsRead(phone);
    },
    [allMessages, fetchMessages, markAsRead]
  );

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center animate-fade-in">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-6"
        >
          <ShieldX size={36} className="text-red-400" />
        </motion.div>
        <h1 className="text-2xl font-display font-bold text-stone-900 mb-2">
          Access Denied
        </h1>
        <p className="text-stone-500">
          This page is restricted to authorized administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/en/admin"
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-stone-900 tracking-tight">
              WhatsApp Messages
            </h1>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              <span className="inline-flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi size={11} className="text-green-500" />
                    <span className="text-green-600">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={11} className="text-stone-400" />
                    <span className="text-stone-400">Connecting...</span>
                  </>
                )}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={fetchConversations}
          className="text-stone-400 hover:text-stone-600 p-2 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          title="Refresh conversations"
        >
          <RefreshCw size={18} />
        </button>
      </motion.div>

      {/* Chat layout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden"
        style={{ height: "calc(100% - 72px)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-stone-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading conversations...</span>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Sidebar - conversation list */}
            <div
              className={`border-r border-stone-200 bg-white shrink-0 ${
                selectedPhone
                  ? "hidden md:flex md:flex-col w-80 lg:w-96"
                  : "flex flex-col w-full md:w-80 lg:w-96"
              }`}
            >
              <ConversationList
                conversations={conversations}
                selectedPhone={selectedPhone}
                onSelect={handleSelectPhone}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Main chat area */}
            <div
              className={`flex-1 flex flex-col bg-stone-50 ${
                selectedPhone ? "flex" : "hidden md:flex"
              }`}
            >
              <AnimatePresence mode="wait">
                {selectedPhone ? (
                  <ChatView
                    key={selectedPhone}
                    phone={selectedPhone}
                    conversations={conversations}
                    messages={allMessages.get(selectedPhone) || []}
                    onBack={() => { setSelectedPhone(null); selectedPhoneRef.current = null; }}
                  />
                ) : (
                  <EmptyState />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
