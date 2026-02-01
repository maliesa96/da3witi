"use client";

import { useMemo, useState, useCallback, useEffect, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, Camera, Users, Clock, Check, CheckCheck, CheckCircle, XCircle, MapPin, Search, Loader2, QrCode, Bell, Eye, ExternalLink, X, Filter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import InvitePreview from "@/app/components/InvitePreview";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/navigation";
import AddGuestForm from "@/app/components/AddGuestForm";
import ConfirmSendInvitesButton from "@/app/components/ConfirmSendInvitesButton";
import DeleteAllGuestsButton from "@/app/components/DeleteAllGuestsButton";
import RecentActivity from "@/app/components/RecentActivity";
import { GuestListClient, type GuestRowData } from "@/app/components/AnimatedGuestRows";
import {
  useRealtimeSubscription,
  toClientGuest,
  type BroadcastGuestPayload as RealtimeGuestPayload,
  type BroadcastEventPayload as RealtimeEventPayload,
} from "@/lib/supabase/RealtimeProvider";

type EventForClient = {
  id: string;
  title: string;
  isScheduled: boolean;
  date: string | null; // ISO
  time: string | null;
  location: string | null; // Google Maps URL
  locationName: string | null;
  message: string | null;
  qrEnabled: boolean;
  guestsEnabled: boolean;
  reminderEnabled: boolean;
  imageUrl: string | null;
  paidAt: string | null; // ISO

  // Denormalized counters from `GET /api/events`
  guestCountTotal?: number;
  inviteCountTotal?: number;
  inviteCountPending?: number;
  inviteCountSent?: number;
  inviteCountDelivered?: number;
  inviteCountRead?: number;
  inviteCountConfirmed?: number;
  inviteCountDeclined?: number;
  inviteCountFailed?: number;
  inviteCountNoReply?: number;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type GuestStats = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  confirmed: number;
  declined: number;
  failed: number;
};

type InviteTotals = {
  filtered: number;
  all: number;
};

// Memoized stat card to avoid re-renders
const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  iconBgClassName,
  onClick,
  isActive = false,
  activeTintClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBgClassName: string;
  onClick?: () => void;
  isActive?: boolean;
  activeTintClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group p-4 rounded-xl border shadow-sm flex flex-col justify-between h-full transition-all text-start ${
        onClick
          ? "cursor-pointer hover:shadow-md hover:border-stone-300 hover:-translate-y-0.5 active:translate-y-0"
          : "cursor-default"
      } ${
        isActive
          ? `border-stone-900 shadow-md ${activeTintClassName || "bg-stone-50"}`
          : "border-stone-200 bg-white"
      }`}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] md:text-xs font-medium text-stone-500">{label}</span>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconBgClassName}`}>
          {icon}
        </span>
      </div>
      <div className="text-xl md:text-2xl font-semibold text-stone-900 tabular-nums">
        {value}
      </div>
    </button>
  );
});

export default function EventPanelClient({
  event,
  initialGuests,
  initialPagination,
  initialStats,
  initialInviteTotals,
}: {
  event: EventForClient;
  initialGuests?: GuestRowData[];
  initialPagination?: PaginationInfo;
  initialStats?: GuestStats;
  initialInviteTotals?: InviteTotals;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();

  // Threshold: use client-side filtering for small lists, server-side for large
  const CLIENT_SIDE_THRESHOLD = 500;
  const pageSize = initialPagination?.pageSize ?? 50;
  const [totalCountForMode, setTotalCountForMode] = useState<number | null>(
    initialPagination?.totalCount ?? (typeof event.guestCountTotal === "number" ? event.guestCountTotal : null)
  );
  const useClientSide = (totalCountForMode ?? Number.POSITIVE_INFINITY) <= CLIENT_SIDE_THRESHOLD;

  const statsFromEvent: GuestStats = useMemo(
    () => ({
      total: event.inviteCountTotal ?? 0,
      pending: event.inviteCountPending ?? 0,
      sent: event.inviteCountSent ?? 0,
      delivered: event.inviteCountDelivered ?? 0,
      read: event.inviteCountRead ?? 0,
      confirmed: event.inviteCountConfirmed ?? 0,
      declined: event.inviteCountDeclined ?? 0,
      failed: event.inviteCountFailed ?? 0,
    }),
    [
      event.inviteCountTotal,
      event.inviteCountPending,
      event.inviteCountSent,
      event.inviteCountDelivered,
      event.inviteCountRead,
      event.inviteCountConfirmed,
      event.inviteCountDeclined,
      event.inviteCountFailed,
    ]
  );
  const inviteTotalsFromEvent: InviteTotals = useMemo(
    () => ({
      all: event.inviteCountTotal ?? 0,
      filtered: event.inviteCountTotal ?? 0,
    }),
    [event.inviteCountTotal]
  );
  const emptyPagination: PaginationInfo = useMemo(
    () => ({
      page: 1,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }),
    [pageSize]
  );

  const fetchGuestsFromApi = useCallback(
    async (options: { page?: number; pageSize?: number; search?: string; statuses?: string[] }) => {
      const params = new URLSearchParams();
      params.set("page", String(options.page ?? 1));
      params.set("pageSize", String(options.pageSize ?? pageSize));
      if (options.search) params.set("search", options.search);
      if (options.statuses?.length) params.set("statuses", options.statuses.join(","));

      const res = await fetch(`/api/events/${encodeURIComponent(event.id)}/guests?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch guests");
      }
      const normalized = {
        ...data,
        guests: (data?.guests || []).map((g: GuestRowData & { inviteCount?: number | null }) => ({
          ...g,
          inviteCount: g.inviteCount ?? undefined,
        })),
      };
      return normalized as {
        guests: GuestRowData[];
        pagination: PaginationInfo;
        stats: GuestStats;
        inviteTotals: InviteTotals;
      };
    },
    [event.id, pageSize]
  );

  // Shared state
  const [serverStats, setServerStats] = useState<GuestStats>(initialStats ?? statsFromEvent);
  const [serverInviteTotals, setServerInviteTotals] = useState<InviteTotals>(
    initialInviteTotals ?? inviteTotalsFromEvent
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(!initialPagination);
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For SSR safety with portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when preview modal is open
  useEffect(() => {
    if (showPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPreview]);

  // === CLIENT-SIDE MODE (for small lists) ===
  const [allGuests, setAllGuests] = useState<GuestRowData[]>(initialGuests ?? []);

  const clientTotalsReady = useMemo(() => {
    if (!useClientSide) return true;
    if (totalCountForMode == null) return false;
    return allGuests.length >= totalCountForMode;
  }, [useClientSide, totalCountForMode, allGuests.length]);

  // Load all guests for client-side filtering (only if under threshold)
  useEffect(() => {
    if (!useClientSide) return;
    if (totalCountForMode == null) return;
    if (totalCountForMode <= allGuests.length) return;

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const result = await fetchGuestsFromApi({
          page: 1,
          pageSize: totalCountForMode,
        });
        if (!cancelled) {
          setAllGuests(result.guests);
          setServerStats(result.stats);
          setServerInviteTotals(result.inviteTotals);
          setTotalCountForMode(result.pagination.totalCount);
        }
      } catch (error) {
        console.error("Failed to fetch all guests:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useClientSide, fetchGuestsFromApi, totalCountForMode, allGuests.length]);

  // Client-side filtering (instant)
  const clientFilteredGuests = useMemo(() => {
    if (!useClientSide) return [];
    const query = searchQuery.toLowerCase().trim();
    return allGuests.filter((g) => {
      const statusOk = selectedStatuses.length === 0 || selectedStatuses.includes(g.status);
      if (!statusOk) return false;
      if (!query) return true;
      return g.name.toLowerCase().includes(query) || g.phone.toLowerCase().includes(query);
    });
  }, [useClientSide, allGuests, searchQuery, selectedStatuses]);

  const clientInviteTotals = useMemo(() => {
    if (!useClientSide) return { all: 0, filtered: 0 };
    const sum = (arr: GuestRowData[]) =>
      arr.reduce((acc, g) => acc + (Number.isFinite(g.inviteCount) ? (g.inviteCount as number) : 1), 0);
    return {
      all: sum(allGuests),
      filtered: sum(clientFilteredGuests),
    };
  }, [useClientSide, allGuests, clientFilteredGuests]);

  // === SERVER-SIDE MODE (for large lists) ===
  const [serverGuests, setServerGuests] = useState<GuestRowData[]>(
    useClientSide ? [] : (initialGuests ?? [])
  );
  // Track guest IDs in a ref so we can dedupe inserts without relying on
  // state-updater purity (React StrictMode can invoke updaters more than once).
  const guestIdsRef = useRef<Set<string>>(new Set((initialGuests ?? []).map((g) => g.id)));

  // Keep the ref in sync as the backing list changes.
  useEffect(() => {
    const source = useClientSide ? allGuests : serverGuests;
    guestIdsRef.current = new Set(source.map((g) => g.id));
  }, [useClientSide, allGuests, serverGuests]);
  const [serverPagination, setServerPagination] = useState<PaginationInfo>(initialPagination ?? emptyPagination);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search for server-side mode
  useEffect(() => {
    if (useClientSide) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [useClientSide, searchQuery]);

  // Fetch from server when search/page changes (server-side mode only)
  const fetchFromServer = useCallback(
    async (page: number, search: string, statuses: string[]) => {
      setIsLoading(true);
      try {
        const result = await fetchGuestsFromApi({
          page,
          pageSize,
          search,
          statuses,
        });
        setServerGuests(result.guests);
        setServerPagination(result.pagination);
        setServerStats(result.stats);
        setServerInviteTotals(result.inviteTotals);
      } catch (error) {
        console.error("Failed to fetch guests:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchGuestsFromApi, pageSize]
  );

  // Trigger server fetch on search/page change
  const [hasSearched, setHasSearched] = useState(false);
  useEffect(() => {
    if (useClientSide) return;
    const hasAnyFilter = debouncedSearch !== "" || selectedStatuses.length > 0;
    if (hasAnyFilter) setHasSearched(true);
    if (hasAnyFilter || hasSearched) {
      fetchFromServer(1, debouncedSearch, selectedStatuses);
      setCurrentPage(1);
    }
  }, [useClientSide, debouncedSearch, selectedStatuses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial guests fetch (when parent only provides the event object)
  useEffect(() => {
    if (initialPagination) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const result = await fetchGuestsFromApi({ page: 1, pageSize });
        if (cancelled) return;
        setServerGuests(result.guests);
        setServerPagination(result.pagination);
        setServerStats(result.stats);
        setServerInviteTotals(result.inviteTotals);
        setTotalCountForMode(result.pagination.totalCount);
        // Seed client-side store with the first page (full sync will happen if under threshold).
        setAllGuests(result.guests);
      } catch (error) {
        console.error("Failed to fetch initial guests:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchGuestsFromApi, initialPagination, pageSize]);

  // === UNIFIED OUTPUT ===
  const displayGuests = useMemo(() => {
    if (useClientSide) {
      const start = (currentPage - 1) * pageSize;
      return clientFilteredGuests.slice(start, start + pageSize);
    }
    return serverGuests;
  }, [useClientSide, clientFilteredGuests, serverGuests, currentPage, pageSize]);

  const pagination = useMemo<PaginationInfo>(() => {
    if (useClientSide) {
      const totalCount = clientFilteredGuests.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      return {
        page: currentPage,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      };
    }
    return serverPagination;
  }, [useClientSide, clientFilteredGuests.length, serverPagination, currentPage, pageSize]);

  // Reset to page 1 when search changes (client-side mode)
  useEffect(() => {
    if (useClientSide) {
      setCurrentPage(1);
    }
  }, [useClientSide, searchQuery, selectedStatuses]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (!useClientSide) {
      fetchFromServer(newPage, debouncedSearch, selectedStatuses);
    }
  };

  // Track if a search is in progress (debouncing or fetching)
  const isSearching = !useClientSide && (searchQuery !== "" || selectedStatuses.length > 0) && (
    searchQuery !== debouncedSearch || isLoading
  );

  // Stats from server (not filtered by search)
  const stats = useMemo(() => {
    return {
      invited: serverStats.total,
      pending: serverStats.pending + serverStats.failed,
      sent: serverStats.sent,
      delivered: serverStats.delivered,
      read: serverStats.read,
      confirmed: serverStats.confirmed,
      declined: serverStats.declined,
    };
  }, [serverStats]);

  const invitedCountDisplay = useMemo(() => {
    if (!event.guestsEnabled) return stats.invited;
    // Avoid "jumping" totals in client-side mode while we're still loading all guests.
    if (useClientSide && !clientTotalsReady) return serverInviteTotals.all;
    return useClientSide ? clientInviteTotals.all : serverInviteTotals.all;
  }, [event.guestsEnabled, stats.invited, useClientSide, clientTotalsReady, clientInviteTotals.all, serverInviteTotals.all]);

  const listTotalDisplay = useMemo(() => {
    if (!event.guestsEnabled) return pagination.totalCount;
    if (useClientSide && !clientTotalsReady) return serverInviteTotals.filtered;
    return useClientSide ? clientInviteTotals.filtered : serverInviteTotals.filtered;
  }, [
    event.guestsEnabled,
    pagination.totalCount,
    useClientSide,
    clientTotalsReady,
    clientInviteTotals.filtered,
    serverInviteTotals.filtered,
  ]);

  const pendingToSend = useMemo(() => {
    // Count from server stats since we need the full count
    return serverStats.pending + serverStats.failed;
  }, [serverStats]);

  const eventDate = event.date

  // Handle local state updates when guests are added
  const handleGuestsAdded = useCallback(
    (newGuests: GuestRowData[]) => {
      // Dedup against any already-present guest IDs (e.g. from realtime insert arriving first).
      const uniqueNewGuests = newGuests.filter((g) => !guestIdsRef.current.has(g.id));
      if (uniqueNewGuests.length === 0) return;
      uniqueNewGuests.forEach((g) => guestIdsRef.current.add(g.id));

      const addedInvites = uniqueNewGuests.reduce(
        (acc, g) => acc + (Number.isFinite(g.inviteCount) ? (g.inviteCount as number) : 1),
        0
      );

      // Update totals/stats (invite-based) outside of list updaters to avoid double-running side effects.
      if (event.guestsEnabled) {
        setServerInviteTotals((totalsPrev) => ({
          all: totalsPrev.all + addedInvites,
          filtered: totalsPrev.filtered + addedInvites,
        }));
      }
      setServerStats((statsPrev) => ({
        ...statsPrev,
        total: statsPrev.total + addedInvites,
        pending: statsPrev.pending + addedInvites,
      }));

      if (useClientSide) {
        // Client-side: add to local array.
        setAllGuests((prev) => [...uniqueNewGuests, ...prev]);
      } else {
        // Server-side: prepend to current page and update pagination.
        setServerGuests((prev) => [...uniqueNewGuests, ...prev].slice(0, pageSize));
        setServerPagination((pagPrev) => ({
          ...pagPrev,
          totalCount: pagPrev.totalCount + uniqueNewGuests.length,
          totalPages: Math.ceil((pagPrev.totalCount + uniqueNewGuests.length) / pagPrev.pageSize),
        }));
      }
    },
    [useClientSide, pageSize, event.guestsEnabled]
  );

  // Handle local state updates when a guest is deleted
  const handleGuestDeleted = useCallback(
    (guestId: string) => {
      // Find the guest first so we know its status and invite count
      const guestList = useClientSide ? allGuests : serverGuests;
      const removed = guestList.find((g) => g.id === guestId);
      
      if (!removed) {
        // Guest already removed (likely by realtime handler), skip
        return;
      }

      const status = removed.status;
      const removedInvites = Number.isFinite(removed.inviteCount) ? (removed.inviteCount as number) : 1;
      // Keep insert-dedupe set in sync
      guestIdsRef.current.delete(guestId);

      if (useClientSide) {
        setAllGuests((prev) => prev.filter((g) => g.id !== guestId));
      } else {
        setServerGuests((prev) => prev.filter((g) => g.id !== guestId));
        setServerPagination((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1),
          totalPages: Math.ceil(Math.max(0, prev.totalCount - 1) / prev.pageSize),
        }));
      }

      // Update invite totals (for both client-side and server-side)
      if (event.guestsEnabled) {
        setServerInviteTotals((prev) => ({
          all: Math.max(0, prev.all - removedInvites),
          filtered: Math.max(0, prev.filtered - removedInvites),
        }));
      }

      // Update stats based on the guest's actual status
      setServerStats((prev) => {
        // Stat cards reflect invite totals by status (invite_count sum)
        const updated = { ...prev, total: Math.max(0, prev.total - removedInvites) };
        if (status === "pending") updated.pending = Math.max(0, updated.pending - removedInvites);
        else if (status === "sent") updated.sent = Math.max(0, updated.sent - removedInvites);
        else if (status === "delivered") updated.delivered = Math.max(0, updated.delivered - removedInvites);
        else if (status === "read") updated.read = Math.max(0, updated.read - removedInvites);
        else if (status === "confirmed") updated.confirmed = Math.max(0, updated.confirmed - removedInvites);
        else if (status === "declined") updated.declined = Math.max(0, updated.declined - removedInvites);
        else if (status === "failed") updated.failed = Math.max(0, updated.failed - removedInvites);
        return updated;
      });
    },
    [useClientSide, event.guestsEnabled, allGuests, serverGuests]
  );

  const handleGuestUpdated = useCallback(
    (updated: GuestRowData) => {
      if (useClientSide) {
        setAllGuests((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
      } else {
        const prevRow = serverGuests.find((g) => g.id === updated.id);
        setServerGuests((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
        if (event.guestsEnabled && prevRow) {
          const before = Number.isFinite(prevRow.inviteCount) ? (prevRow.inviteCount as number) : 1;
          const after = Number.isFinite(updated.inviteCount) ? (updated.inviteCount as number) : 1;
          const delta = after - before;
          if (delta !== 0) {
            setServerInviteTotals((prev) => ({
              all: Math.max(0, prev.all + delta),
              filtered: Math.max(0, prev.filtered + delta),
            }));
          }
        }
      }
    },
    [useClientSide, event.guestsEnabled, serverGuests]
  );

  // Handle when all pending guests are deleted
  const handleAllGuestsDeleted = useCallback(() => {
    if (useClientSide) {
      // Remove all pending/failed guests from local state
      setAllGuests((prev) => prev.filter((g) => g.status !== 'pending' && g.status !== 'failed'));
    } else {
      // Server-side: refresh from server to keep invite totals accurate
      (async () => {
        setIsLoading(true);
        try {
          const result = await fetchGuestsFromApi({
            page: 1,
            pageSize,
            search: debouncedSearch,
            statuses: selectedStatuses,
          });
          setServerGuests(result.guests);
          setServerPagination(result.pagination);
          setServerStats(result.stats);
          setServerInviteTotals(result.inviteTotals);
          setCurrentPage(1);
        } catch (error) {
          console.error("Failed to refresh guests after delete-all:", error);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [useClientSide, fetchGuestsFromApi, pageSize, debouncedSearch, selectedStatuses]);

  // Handle when invites are sent - refresh data to get updated statuses
  const handleInvitesSent = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchGuestsFromApi(
        useClientSide
          ? {
              page: 1,
              pageSize: Math.max(serverStats.total || 0, pageSize),
              search: "",
            }
          : {
              page: currentPage,
              pageSize,
              search: debouncedSearch,
              statuses: selectedStatuses,
            }
      );
      if (useClientSide) {
        setAllGuests(result.guests);
      } else {
        setServerGuests(result.guests);
        setServerPagination(result.pagination);
      }
      setServerStats(result.stats);
      setServerInviteTotals(result.inviteTotals);
    } catch (error) {
      console.error("Failed to refresh guests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchGuestsFromApi, useClientSide, serverStats.total, pageSize, currentPage, debouncedSearch, selectedStatuses]);

  const statusOptions = useMemo(
    () => [
      { value: "pending", label: t("status_pending") },
      { value: "sent", label: t("status_sent") },
      { value: "delivered", label: t("status_delivered") },
      { value: "read", label: t("status_read") },
      { value: "confirmed", label: t("status_present") },
      { value: "declined", label: t("status_declined") },
      { value: "failed", label: t("status_failed") },
    ],
    [t]
  );

  const hasFilters = searchQuery.trim() !== "" || selectedStatuses.length > 0;

  const normalizeStatuses = useCallback((arr: string[]) => {
    return Array.from(new Set(arr.map((s) => String(s || "").trim()).filter(Boolean))).sort();
  }, []);

  const sameStatuses = useCallback(
    (a: string[], b: string[]) => {
      const aa = normalizeStatuses(a);
      const bb = normalizeStatuses(b);
      if (aa.length !== bb.length) return false;
      for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
      return true;
    },
    [normalizeStatuses]
  );

  const toggleStatusFilter = useCallback(
    (statusesToApply: string[]) => {
      setSelectedStatuses((prev) => {
        const next = normalizeStatuses(statusesToApply);
        return sameStatuses(prev, next) ? [] : next;
      });
    },
    [normalizeStatuses, sameStatuses]
  );

  const activeQuickFilter = useMemo(() => normalizeStatuses(selectedStatuses), [normalizeStatuses, selectedStatuses]);
  const isPendingQuickActive = useMemo(
    () => sameStatuses(activeQuickFilter, ["pending", "failed"]),
    [activeQuickFilter, sameStatuses]
  );
  const isSentQuickActive = useMemo(() => sameStatuses(activeQuickFilter, ["sent"]), [activeQuickFilter, sameStatuses]);
  const isDeliveredQuickActive = useMemo(
    () => sameStatuses(activeQuickFilter, ["delivered"]),
    [activeQuickFilter, sameStatuses]
  );
  const isReadQuickActive = useMemo(() => sameStatuses(activeQuickFilter, ["read"]), [activeQuickFilter, sameStatuses]);
  const isConfirmedQuickActive = useMemo(
    () => sameStatuses(activeQuickFilter, ["confirmed"]),
    [activeQuickFilter, sameStatuses]
  );
  const isDeclinedQuickActive = useMemo(
    () => sameStatuses(activeQuickFilter, ["declined"]),
    [activeQuickFilter, sameStatuses]
  );

  // === REALTIME SUBSCRIPTIONS ===
  // Subscribe to live guest status updates via Broadcast
  const handleRealtimeGuestUpdate = useCallback(
    (payload: RealtimeGuestPayload) => {
      const guest = toClientGuest(payload);
      const oldStatus = payload.oldStatus;
      const newStatus = guest.status;
      const invites = Number.isFinite(guest.inviteCount) ? (guest.inviteCount as number) : 1;

      // Update the guest in the appropriate list
      if (useClientSide) {
        setAllGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, ...guest } : g))
        );
      } else {
        setServerGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, ...guest } : g))
        );
      }

      // Update stats if status changed
      if (oldStatus && oldStatus !== newStatus) {
        setServerStats((prev) => {
          const updated = { ...prev };
          // Decrement old status count
          if (oldStatus === "pending") updated.pending = Math.max(0, updated.pending - invites);
          else if (oldStatus === "sent") updated.sent = Math.max(0, updated.sent - invites);
          else if (oldStatus === "delivered") updated.delivered = Math.max(0, updated.delivered - invites);
          else if (oldStatus === "read") updated.read = Math.max(0, updated.read - invites);
          else if (oldStatus === "confirmed") updated.confirmed = Math.max(0, updated.confirmed - invites);
          else if (oldStatus === "declined") updated.declined = Math.max(0, updated.declined - invites);
          else if (oldStatus === "failed") updated.failed = Math.max(0, updated.failed - invites);

          // Increment new status count
          if (newStatus === "pending") updated.pending += invites;
          else if (newStatus === "sent") updated.sent += invites;
          else if (newStatus === "delivered") updated.delivered += invites;
          else if (newStatus === "read") updated.read += invites;
          else if (newStatus === "confirmed") updated.confirmed += invites;
          else if (newStatus === "declined") updated.declined += invites;
          else if (newStatus === "failed") updated.failed += invites;

          return updated;
        });
      }
    },
    [useClientSide]
  );

  const handleRealtimeGuestInsert = useCallback(
    (payload: RealtimeGuestPayload) => {
      const guest = toClientGuest(payload);

      // Dedupe using a ref (safe across StrictMode and async state scheduling)
      if (guestIdsRef.current.has(guest.id)) {
        return;
      }
      guestIdsRef.current.add(guest.id);

      const invites = Number.isFinite(guest.inviteCount) ? (guest.inviteCount as number) : 1;

      // Update stats/totals outside list state updaters (avoid double-running side effects)
      setServerStats((statsPrev) => ({
        ...statsPrev,
        total: statsPrev.total + invites,
        pending: statsPrev.pending + invites,
      }));
      setServerInviteTotals((totalsPrev) => ({
        all: totalsPrev.all + invites,
        filtered: totalsPrev.filtered + invites,
      }));

      if (useClientSide) {
        setAllGuests((prev) => [guest, ...prev]);
      } else {
        setServerGuests((prev) => [guest, ...prev].slice(0, pageSize));
        setServerPagination((pagPrev) => ({
          ...pagPrev,
          totalCount: pagPrev.totalCount + 1,
          totalPages: Math.ceil((pagPrev.totalCount + 1) / pagPrev.pageSize),
        }));
      }
    },
    [useClientSide, pageSize]
  );

  const handleRealtimeGuestDelete = useCallback(
    (payload: RealtimeGuestPayload) => {
      const guestId = payload.id;
      const status = payload.status;
      const invites = payload.inviteCount ?? 1;

      // Check if guest exists before removing (to avoid double-decrementing stats)
      const guestList = useClientSide ? allGuests : serverGuests;
      const guestExists = guestList.some((g) => g.id === guestId);
      
      if (!guestExists) {
        // Guest already removed (likely by local handler), skip
        return;
      }

      // Keep insert-dedupe set in sync
      guestIdsRef.current.delete(guestId);

      if (useClientSide) {
        setAllGuests((prev) => prev.filter((g) => g.id !== guestId));
      } else {
        setServerGuests((prev) => prev.filter((g) => g.id !== guestId));
        setServerPagination((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1),
          totalPages: Math.ceil(Math.max(0, prev.totalCount - 1) / prev.pageSize),
        }));
      }

      // Update stats
      setServerStats((prev) => {
        // Stat cards reflect invite totals by status (invite_count sum)
        const updated = { ...prev, total: Math.max(0, prev.total - invites) };
        if (status === "pending") updated.pending = Math.max(0, updated.pending - invites);
        else if (status === "sent") updated.sent = Math.max(0, updated.sent - invites);
        else if (status === "delivered") updated.delivered = Math.max(0, updated.delivered - invites);
        else if (status === "read") updated.read = Math.max(0, updated.read - invites);
        else if (status === "confirmed") updated.confirmed = Math.max(0, updated.confirmed - invites);
        else if (status === "declined") updated.declined = Math.max(0, updated.declined - invites);
        else if (status === "failed") updated.failed = Math.max(0, updated.failed - invites);
        return updated;
      });

      // Update invite totals
      setServerInviteTotals((prev) => ({
        all: Math.max(0, prev.all - invites),
        filtered: Math.max(0, prev.filtered - invites),
      }));
    },
    [useClientSide, allGuests, serverGuests]
  );

  const handleRealtimeEventUpdate = useCallback((payload: RealtimeEventPayload) => {
    // Update stats from the broadcast payload
    setServerStats({
      // Stat cards reflect invite totals by status (invite_count sum).
      total: payload.inviteCountTotal,
      pending: payload.inviteCountPending,
      sent: payload.inviteCountSent,
      delivered: payload.inviteCountDelivered,
      read: payload.inviteCountRead,
      confirmed: payload.inviteCountConfirmed,
      declined: payload.inviteCountDeclined,
      failed: payload.inviteCountFailed,
    });

    setServerInviteTotals((prev) => ({
      ...prev,
      all: payload.inviteCountTotal,
    }));
  }, []);

  // Subscribe to shared realtime channel (managed by RealtimeProvider)
  useRealtimeSubscription({
    onGuestUpdate: handleRealtimeGuestUpdate,
    onGuestInsert: handleRealtimeGuestInsert,
    onGuestDelete: handleRealtimeGuestDelete,
    onEventUpdate: handleRealtimeEventUpdate,
  });

  // Mobile activity sheet state
  const [showMobileActivity, setShowMobileActivity] = useState(false);

  // Prevent body scroll when mobile activity sheet is open
  useEffect(() => {
    if (showMobileActivity) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileActivity]);

  return (
    <div className="space-y-8">
      {/* Event Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white via-stone-50 to-white border border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-linear-to-r from-amber-50/60 via-transparent to-blue-50/50"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>

        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-stone-500 mb-2">
                {event.isScheduled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-xs font-medium border border-amber-200 text-amber-700 shadow-sm">
                    {t("scheduled") || "Scheduled"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-stone-900">
                  {event.title}
                </h1>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 rounded-full">
                  <Users size={14} className="text-stone-300" />
                  <span className="text-sm font-semibold text-white tabular-nums">{invitedCountDisplay}</span>
                  <span className="text-xs text-stone-400">{t("guests_label") || "guests"}</span>
                </div>
              </div>
              
              {/* Event Details Grid */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-stone-600 mt-2">
                {eventDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-stone-400" />
                    <span>{eventDate}</span>
                  </div>
                )}
                {event.time && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-stone-400" />
                    <span>{event.time}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-stone-400" />
                  {event.location ? (
                    <a 
                      href={event.location} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-stone-900 hover:underline flex items-center gap-1"
                    >
                      {event.locationName || t("no_location")}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>{event.locationName || t("no_location")}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <QrCode size={14} className={event.qrEnabled ? "text-green-500" : "text-stone-300"} />
                  <span className={event.qrEnabled ? "" : "text-stone-400"}>
                    {event.qrEnabled ? t("qr_enabled") || "QR Enabled" : t("qr_disabled") || "QR Disabled"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bell size={14} className={event.reminderEnabled ? "text-amber-500" : "text-stone-300"} />
                  <span className={event.reminderEnabled ? "" : "text-stone-400"}>
                    {event.reminderEnabled ? t("reminder_on") || "Reminders On" : t("reminder_off") || "Reminders Off"}
                  </span>
                </div>
              </div>

            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 bg-white/70 hover:bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Eye size={16} />
                {t("preview_invite") || "Preview Invite"}
              </button>
              {event.qrEnabled && (
                <Link
                  href={`/dashboard/scan?eventId=${event.id}`}
                  className="px-4 py-2 bg-white/70 hover:bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Camera size={16} />
                  {t("scan_qr") || "Scan QR"}
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <ConfirmSendInvitesButton 
              pendingToSend={pendingToSend} 
              onSent={handleInvitesSent}
              eventId={event.id}
              isPaid={!!event.paidAt}
            />
            <div className="w-full">
              <AddGuestForm
                eventId={event.id}
                guestsEnabled={event.guestsEnabled}
                onGuestsAdded={handleGuestsAdded}
                buttonClassName="w-full px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 bg-white text-stone-900 border border-stone-200 hover:bg-stone-50 hover:-translate-y-0.5 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Activity on left (desktop), Stats + Guest List on right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Recent Activity (desktop only) */}
        <div className="hidden lg:block w-96 shrink-0">
          <div className="sticky top-24">
            <RecentActivity 
              eventId={event.id} 
              isPaid={!!event.paidAt}
              maxItems={15}
            />
          </div>
        </div>

        {/* Right Column: Stats + Guest List */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <StatCard
              label={t("pending")}
              value={stats.pending}
              icon={<Clock size={16} />}
              iconBgClassName="bg-amber-50 border border-amber-100 text-amber-600"
              onClick={() => toggleStatusFilter(["pending", "failed"])}
              isActive={isPendingQuickActive}
              activeTintClassName="bg-amber-50/70"
            />
            <StatCard
              label={t("sent")}
              value={stats.sent}
              icon={<Check size={16} />}
              iconBgClassName="bg-stone-50 border border-stone-100 text-stone-500"
              onClick={() => toggleStatusFilter(["sent"])}
              isActive={isSentQuickActive}
              activeTintClassName="bg-stone-50/70"
            />
            <StatCard
              label={t("delivered")}
              value={stats.delivered}
              icon={<CheckCheck size={16} />}
              iconBgClassName="bg-stone-50 border border-stone-100 text-stone-500"
              onClick={() => toggleStatusFilter(["delivered"])}
              isActive={isDeliveredQuickActive}
              activeTintClassName="bg-stone-50/70"
            />
            <StatCard
              label={t("read")}
              value={stats.read}
              icon={<CheckCheck size={16} />}
              iconBgClassName="bg-blue-50 border border-blue-100 text-blue-500"
              onClick={() => toggleStatusFilter(["read"])}
              isActive={isReadQuickActive}
              activeTintClassName="bg-blue-50/70"
            />
            <StatCard
              label={t("confirmed")}
              value={stats.confirmed}
              icon={<CheckCircle size={16} />}
              iconBgClassName="bg-green-50 border border-green-100 text-green-600"
              onClick={() => toggleStatusFilter(["confirmed"])}
              isActive={isConfirmedQuickActive}
              activeTintClassName="bg-green-50/70"
            />
            <StatCard
              label={t("declined")}
              value={stats.declined}
              icon={<XCircle size={16} />}
              iconBgClassName="bg-red-50 border border-red-100 text-red-600"
              onClick={() => toggleStatusFilter(["declined"])}
              isActive={isDeclinedQuickActive}
              activeTintClassName="bg-red-50/70"
            />
          </div>

          {/* Guest List Container */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-stone-900">{t("guest_list")}</h3>
                {isLoading && <Loader2 size={14} className="animate-spin text-stone-400" />}
                <span className="text-xs text-stone-400">
                  ({listTotalDisplay} {t("total_guests") || "total"})
                </span>
                <DeleteAllGuestsButton
                  eventId={event.id}
                  pendingCount={serverStats.pending + serverStats.failed}
                  onDeleted={handleAllGuestsDeleted}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <details className="relative group">
                  <summary className="list-none cursor-pointer select-none px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 hover:bg-stone-100 transition-colors inline-flex items-center gap-2 whitespace-nowrap">
                    <Filter size={14} className="text-stone-400" />
                    <span>
                      {selectedStatuses.length === 0
                        ? `${t("status_filter")} · ${t("status_filter_all")}`
                        : `${t("status_filter")} · ${selectedStatuses.length}`}
                    </span>
                  </summary>
                  <div className="absolute z-50 mt-2 right-0 rtl:right-auto rtl:left-0 w-60 bg-white border border-stone-200 rounded-xl shadow-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-stone-700">{t("status_filter")}</div>
                      <button
                        type="button"
                        className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer disabled:cursor-not-allowed"
                        onClick={() => setSelectedStatuses([])}
                        disabled={selectedStatuses.length === 0}
                      >
                        {t("status_filter_clear")}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {statusOptions.map((opt) => {
                        const checked = selectedStatuses.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedStatuses((prev) =>
                                  prev.includes(opt.value)
                                    ? prev.filter((s) => s !== opt.value)
                                    : [...prev, opt.value]
                                );
                              }}
                              className="accent-stone-900"
                            />
                            <span className="text-xs text-stone-700">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </details>

                <div className="relative w-full sm:w-auto">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 rtl:right-auto rtl:left-3">
                    {isSearching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search_placeholder")}
                    className="pr-8 pl-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-400 w-full sm:w-48 rtl:pr-4 rtl:pl-8"
                  />
                </div>
              </div>
            </div>

            <GuestListClient
              eventId={event.id}
              guests={displayGuests}
              guestsEnabled={event.guestsEnabled}
              qrEnabled={event.qrEnabled}
              onGuestsAdded={handleGuestsAdded}
              onGuestDeleted={handleGuestDeleted}
              onGuestUpdated={handleGuestUpdated}
              pagination={pagination}
              onPageChange={handlePageChange}
              isLoading={isLoading}
              searchQuery={searchQuery}
              hasFilters={hasFilters}
            />
          </div>
        </div>
      </div>

      {/* Mobile Activity FAB - shows on smaller screens */}
      <div className="lg:hidden fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-40">
        <button
          type="button"
          onClick={() => setShowMobileActivity(true)}
          className="w-14 h-14 rounded-full bg-stone-900 text-white shadow-lg flex items-center justify-center hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <Bell size={22} />
        </button>
      </div>

      {/* Mobile Activity Sheet */}
      {mounted && createPortal(
        <AnimatePresence>
          {showMobileActivity && (
            <motion.div
              className="fixed inset-0 z-9999 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
                onClick={() => setShowMobileActivity(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              
              {/* Sheet */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-stone-300" />
                </div>
                
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setShowMobileActivity(false)}
                  className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X size={20} />
                </button>
                
                {/* Activity Content */}
                <div className="flex-1 overflow-hidden">
                  <RecentActivity 
                    eventId={event.id} 
                    isPaid={!!event.paidAt}
                    maxItems={20}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Invite Preview Modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {showPreview && (
            <motion.div
              className="fixed inset-0 z-9999 p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-visible"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-stone-700 transition-colors shadow-sm"
                >
                  <X size={18} />
                </button>
                <div className="p-4 overflow-visible" style={{ isolation: 'isolate' }}>
                  <InvitePreview
                  title={event.title}
                  date={event.date || ""}
                  time={event.time || undefined}
                  locationName={event.locationName || ""}
                  location={event.location || undefined}
                  message={event.message || ""}
                  imageUrl={event.imageUrl || undefined}
                  showQr={event.qrEnabled}
                  guestsEnabled={event.guestsEnabled}
                  locale={locale as "en" | "ar"}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

