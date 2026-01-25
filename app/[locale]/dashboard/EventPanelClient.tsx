"use client";

import { useMemo, useState, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Calendar, Camera, Users, Clock, Check, CheckCheck, CheckCircle2, XCircle, MapPin, Search, Loader2, QrCode, Bell, Eye, ExternalLink, X, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import InvitePreview from "@/app/components/InvitePreview";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/navigation";
import AddGuestForm from "@/app/components/AddGuestForm";
import ConfirmSendInvitesButton from "@/app/components/ConfirmSendInvitesButton";
import DeleteAllGuestsButton from "@/app/components/DeleteAllGuestsButton";
import { GuestListClient, type GuestRowData } from "@/app/components/AnimatedGuestRows";
import { getGuestsPaginated } from "./actions";

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

// Memoized stat card to avoid re-renders
const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  iconBgClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBgClassName: string;
}) {
  return (
    <div className="group bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md hover:border-stone-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] md:text-xs font-medium text-stone-500">{label}</span>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconBgClassName}`}>
          {icon}
        </span>
      </div>
      <div className="text-xl md:text-2xl font-semibold text-stone-900 tabular-nums">
        {value}
      </div>
    </div>
  );
});

export default function EventPanelClient({
  event,
  initialGuests,
  initialPagination,
  initialStats,
  sendInvitesAction,
}: {
  event: EventForClient;
  initialGuests: GuestRowData[];
  initialPagination: PaginationInfo;
  initialStats: GuestStats;
  sendInvitesAction: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();

  // Threshold: use client-side filtering for small lists, server-side for large
  const CLIENT_SIDE_THRESHOLD = 500;
  const useClientSide = initialPagination.totalCount <= CLIENT_SIDE_THRESHOLD;
  const pageSize = initialPagination.pageSize;

  // Shared state
  const [serverStats, setServerStats] = useState<GuestStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
  const [allGuests, setAllGuests] = useState<GuestRowData[]>(initialGuests);
  const [clientSideReady, setClientSideReady] = useState(
    useClientSide && initialPagination.totalCount <= initialGuests.length
  );

  // Load all guests for client-side filtering (only if under threshold)
  useEffect(() => {
    if (!useClientSide) return;
    if (initialPagination.totalCount <= initialGuests.length) return;

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const result = await getGuestsPaginated(event.id, {
          page: 1,
          pageSize: initialPagination.totalCount,
        });
        if (!cancelled) {
          setAllGuests(result.guests);
          setServerStats(result.stats);
          setClientSideReady(true);
        }
      } catch (error) {
        console.error("Failed to fetch all guests:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useClientSide, event.id, initialPagination.totalCount, initialGuests.length]);

  // Client-side filtering (instant)
  const clientFilteredGuests = useMemo(() => {
    if (!useClientSide) return [];
    if (!searchQuery.trim()) return allGuests;
    const query = searchQuery.toLowerCase().trim();
    return allGuests.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.phone.toLowerCase().includes(query)
    );
  }, [useClientSide, allGuests, searchQuery]);

  // === SERVER-SIDE MODE (for large lists) ===
  const [serverGuests, setServerGuests] = useState<GuestRowData[]>(
    useClientSide ? [] : initialGuests
  );
  const [serverPagination, setServerPagination] = useState(initialPagination);
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
    async (page: number, search: string) => {
      setIsLoading(true);
      try {
        const result = await getGuestsPaginated(event.id, {
          page,
          pageSize,
          search,
        });
        setServerGuests(result.guests);
        setServerPagination(result.pagination);
        setServerStats(result.stats);
      } catch (error) {
        console.error("Failed to fetch guests:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [event.id, pageSize]
  );

  // Trigger server fetch on search/page change
  const [hasSearched, setHasSearched] = useState(false);
  useEffect(() => {
    if (useClientSide) return;
    if (debouncedSearch !== "") setHasSearched(true);
    if (debouncedSearch !== "" || hasSearched) {
      fetchFromServer(1, debouncedSearch);
      setCurrentPage(1);
    }
  }, [useClientSide, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [useClientSide, searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (!useClientSide) {
      fetchFromServer(newPage, debouncedSearch);
    }
  };

  // Track if a search is in progress (debouncing or fetching)
  const isSearching = !useClientSide && searchQuery !== "" && (
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

  const pendingToSend = useMemo(() => {
    // Count from server stats since we need the full count
    return serverStats.pending + serverStats.failed;
  }, [serverStats]);

  const eventDate = event.date

  // Handle local state updates when guests are added
  const handleGuestsAdded = useCallback(
    (newGuests: GuestRowData[]) => {
      if (useClientSide) {
        // Client-side: add to local array
        setAllGuests((prev) => [...newGuests, ...prev]);
      } else {
        // Server-side: prepend to current page and update pagination
        setServerGuests((prev) => [...newGuests, ...prev].slice(0, pageSize));
        setServerPagination((prev) => ({
          ...prev,
          totalCount: prev.totalCount + newGuests.length,
          totalPages: Math.ceil((prev.totalCount + newGuests.length) / prev.pageSize),
        }));
      }
      // Update stats locally
      setServerStats((prev) => ({
        ...prev,
        total: prev.total + newGuests.length,
        pending: prev.pending + newGuests.length,
      }));
    },
    [useClientSide, pageSize]
  );

  // Handle local state updates when a guest is deleted
  const handleGuestDeleted = useCallback(
    (guestId: string) => {
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
      // Update stats locally
      setServerStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        pending: Math.max(0, prev.pending - 1),
      }));
    },
    [useClientSide]
  );

  // Handle when all pending guests are deleted
  const handleAllGuestsDeleted = useCallback(() => {
    if (useClientSide) {
      // Remove all pending/failed guests from local state
      setAllGuests((prev) => prev.filter((g) => g.status !== 'pending' && g.status !== 'failed'));
    } else {
      // For server-side, filter current page and update pagination
      setServerGuests((prev) => prev.filter((g) => g.status !== 'pending' && g.status !== 'failed'));
      setServerPagination((prev) => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - serverStats.pending - serverStats.failed),
        totalPages: Math.ceil(Math.max(0, prev.totalCount - serverStats.pending - serverStats.failed) / prev.pageSize),
      }));
    }
    // Reset stats for pending/failed
    setServerStats((prev) => ({
      ...prev,
      total: prev.total - prev.pending - prev.failed,
      pending: 0,
      failed: 0,
    }));
  }, [useClientSide, serverStats.pending, serverStats.failed]);

  // Handle when invites are sent - refresh data to get updated statuses
  const handleInvitesSent = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getGuestsPaginated(event.id, {
        page: currentPage,
        pageSize,
        search: useClientSide ? "" : debouncedSearch,
      });
      if (useClientSide) {
        setAllGuests(result.guests);
      } else {
        setServerGuests(result.guests);
        setServerPagination(result.pagination);
      }
      setServerStats(result.stats);
    } catch (error) {
      console.error("Failed to refresh guests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [event.id, currentPage, pageSize, useClientSide, debouncedSearch]);

  return (
    <div className="space-y-8">
      {/* Event Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-stone-50 to-white border border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/60 via-transparent to-blue-50/50"></div>
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
                  <span className="text-sm font-semibold text-white tabular-nums">{stats.invited}</span>
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
                className="px-4 py-2 bg-white/70 hover:bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 transition-all flex items-center gap-2 shadow-sm"
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
              action={sendInvitesAction} 
              onSent={handleInvitesSent}
              eventId={event.id}
              isPaid={!!event.paidAt}
            />
            <div className="w-full">
              <AddGuestForm
                eventId={event.id}
                guestsEnabled={event.guestsEnabled}
                onGuestsAdded={handleGuestsAdded}
                buttonClassName="w-full px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 bg-white text-stone-900 border border-stone-200 hover:bg-stone-50 hover:-translate-y-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
        <StatCard
          label={t("pending")}
          value={stats.pending}
          icon={<Clock size={16} />}
          iconBgClassName="bg-amber-50 border border-amber-100 text-amber-600"
        />
        <StatCard
          label={t("sent")}
          value={stats.sent}
          icon={<Send size={16} />}
          iconBgClassName="bg-violet-50 border border-violet-100 text-violet-600"
        />
        <StatCard
          label={t("delivered")}
          value={stats.delivered}
          icon={<Check size={16} />}
          iconBgClassName="bg-sky-50 border border-sky-100 text-sky-600"
        />
        <StatCard
          label={t("read")}
          value={stats.read}
          icon={<CheckCheck size={16} />}
          iconBgClassName="bg-blue-50 border border-blue-100 text-blue-600"
        />
        <StatCard
          label={t("confirmed")}
          value={stats.confirmed}
          icon={<CheckCircle2 size={16} />}
          iconBgClassName="bg-green-50 border border-green-100 text-green-600"
        />
        <StatCard
          label={t("declined")}
          value={stats.declined}
          icon={<XCircle size={16} />}
          iconBgClassName="bg-red-50 border border-red-100 text-red-600"
        />
      </div>

      {/* Guest List Container */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-stone-900">{t("guest_list")}</h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-stone-400" />}
            <span className="text-xs text-stone-400">
              ({pagination.totalCount} {t("total_guests") || "total"})
            </span>
            <DeleteAllGuestsButton
              eventId={event.id}
              pendingCount={serverStats.pending + serverStats.failed}
              onDeleted={handleAllGuestsDeleted}
            />
          </div>
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

        <GuestListClient
          eventId={event.id}
          guests={displayGuests}
          guestsEnabled={event.guestsEnabled}
          qrEnabled={event.qrEnabled}
          onGuestsAdded={handleGuestsAdded}
          onGuestDeleted={handleGuestDeleted}
          pagination={pagination}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          searchQuery={searchQuery}
        />
      </div>

      {/* Invite Preview Modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {showPreview && (
            <motion.div
              className="fixed inset-0 z-[9999] p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
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

