"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { StatusIcon, getStatusPillClasses } from "@/lib/statusConfig";
import { useTranslations } from "next-intl";

import {
  deleteGuest as deleteGuestServerAction,
  updateGuest as updateGuestServerAction,
} from "@/app/[locale]/dashboard/actions";
import AddGuestForm from "@/app/components/AddGuestForm";

export type GuestRowData = {
  id: string;
  name: string;
  phone: string;
  inviteCount?: number;
  status: string;
  checkedIn: boolean;
  whatsappMessageId: string | null;
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

function StatusPill({
  status,
  label,
  tooltip,
}: {
  status: string;
  label: string;
  tooltip: string;
}) {
  const pillClasses = getStatusPillClasses(status);
  return (
    <div className="relative group cursor-help inline-block">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border shadow-sm transition-colors ${pillClasses}`}
      >
        <span className="mr-1.5 rtl:mr-0 rtl:ml-1.5 flex items-center">
          <StatusIcon status={status} size={12} />
        </span>
        {label}
      </span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-stone-900 text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none shadow-lg shadow-stone-900/20 z-10">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-stone-900"></div>
      </div>
    </div>
  );
}

function getStatusBadge(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  status: string
) {
  switch (status) {
    case "confirmed":
      return (
        <StatusPill
          status="confirmed"
          label={t("status_present")}
          tooltip={t("tooltip_confirmed")}
        />
      );
    case "declined":
      return (
        <StatusPill
          status="declined"
          label={t("status_declined")}
          tooltip={t("tooltip_declined")}
        />
      );
    case "sent":
      return (
        <StatusPill
          status="sent"
          label={t("status_sent")}
          tooltip={t("tooltip_sent")}
        />
      );
    case "delivered":
      return (
        <StatusPill
          status="delivered"
          label={t("status_delivered")}
          tooltip={t("tooltip_delivered")}
        />
      );
    case "read":
      return (
        <StatusPill
          status="read"
          label={t("status_read")}
          tooltip={t("tooltip_read")}
        />
      );
    case "failed":
      return (
        <StatusPill
          status="failed"
          label={t("status_failed")}
          tooltip={t("tooltip_failed")}
        />
      );
    case "pending":
      return (
        <StatusPill
          status="pending"
          label={t("status_pending")}
          tooltip={t("tooltip_pending")}
        />
      );
    default:
      return (
        <StatusPill
          status="no_reply"
          label={t("status_no_reply")}
          tooltip={t("tooltip_no_reply")}
        />
      );
  }
}

function DeleteButton({
  guestId,
  onDeleted,
}: {
  guestId: string;
  onDeleted: () => void;
}) {
  const t = useTranslations("Dashboard");
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className={`text-stone-400 hover:text-red-600 p-2 border border-stone-100 rounded-md hover:border-red-100 hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${
        pending ? "opacity-60 cursor-not-allowed" : ""
      }`}
      title={t("delete_guest")}
      aria-label={t("delete_guest")}
      onClick={async () => {
        setPending(true);
        try {
          await deleteGuestServerAction(guestId);
          onDeleted();
        } catch (err) {
          console.error("Failed to delete guest:", err);
          alert("Failed to delete guest. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Trash2 size={16} />
      )}
    </button>
  );
}

function EmptyState({
  t,
  eventId,
  guestsEnabled,
  onGuestsAdded,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  eventId: string;
  guestsEnabled?: boolean;
  onGuestsAdded?: (guests: GuestRowData[]) => void;
}) {
  return (
    <div className="px-6 py-16 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="text-stone-300" size={32} />
      </div>
      <h3 className="text-stone-900 font-medium mb-1">
        {t("no_guests_title") || "No Guests Yet"}
      </h3>
      <p className="text-stone-500 text-sm max-w-xs mx-auto mb-6">
        {t("no_guests_desc") ||
          "Start by adding guests to your event list. You can add them manually to get started."}
      </p>
      <div className="w-full max-w-[200px] mx-auto flex justify-center">
        <AddGuestForm eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} />
      </div>
    </div>
  );
}

function NoResultsState({
  t,
  searchQuery,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  searchQuery: string;
}) {
  const query = searchQuery.trim();
  return (
    <div className="px-6 py-16 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
        <Search className="text-stone-300" size={32} />
      </div>
      <h3 className="text-stone-900 font-medium mb-1">
        {t("no_results_title") || "No Results Found"}
      </h3>
      <p className="text-stone-500 text-sm max-w-xs mx-auto">
        {query
          ? t("no_results_desc", { query }) ||
            `No guests match "${query}". Try a different search term.`
          : t("no_results_desc_filters") || "No guests match the selected filters."}
      </p>
    </div>
  );
}

function PaginationControls({
  pagination,
  onPageChange,
  isLoading,
}: {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}) {
  const t = useTranslations("Dashboard");
  const { page, totalPages, totalCount, pageSize } = pagination;

  // Calculate range being shown
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="px-4 md:px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs text-stone-500">
        {t("showing_range") || "Showing"} {startItem}-{endItem} {t("of") || "of"} {totalCount}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!pagination.hasPrevPage || isLoading}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("prev_page") || "Previous page"}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-stone-400">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                  pageNum === page
                    ? "bg-stone-900 text-white"
                    : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                } cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!pagination.hasNextPage || isLoading}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("next_page") || "Next page"}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function EditButton({
  guest,
  guestsEnabled,
  onUpdated,
}: {
  guest: GuestRowData;
  guestsEnabled: boolean;
  onUpdated: (guest: GuestRowData) => void;
}) {
  const t = useTranslations("Dashboard");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  // Keep as text so users can clear and type (e.g. replace "1" with "2")
  const [inviteCountInput, setInviteCountInput] = useState<string>(String(guest.inviteCount || 1));

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = () => {
    setError(null);
    setName(guest.name);
    setPhone(guest.phone);
    setInviteCountInput(String(guest.inviteCount || 1));
    setOpen(true);
  };

  const closeModal = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      let inviteCount: number | undefined = undefined;
      if (guestsEnabled) {
        const trimmed = inviteCountInput.trim();
        const n = trimmed === "" ? NaN : Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 50) {
          setError(t("error_invalid_invite_count"));
          setPending(false);
          return;
        }
        inviteCount = n;
      }
      const res = await updateGuestServerAction(guest.id, {
        name,
        phone,
        ...(guestsEnabled ? { inviteCount } : {}),
      });
      if (res?.success && res.guest) {
        onUpdated(res.guest as GuestRowData);
        setOpen(false);
      } else {
        setError(t("edit_guest_save_failed"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NAME_TOO_SHORT")) setError(t("error_name_too_short"));
      else if (msg.includes("INVALID_PHONE")) setError(t("error_invalid_phone"));
      else if (msg.includes("INVALID_INVITE_COUNT")) setError(t("error_invalid_invite_count"));
      else setError(t("edit_guest_save_failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={`text-stone-400 hover:text-stone-900 p-2 border border-stone-100 rounded-md hover:border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${
          pending ? "opacity-60 cursor-not-allowed" : ""
        }`}
        title={t("edit_guest")}
        aria-label={t("edit_guest")}
        onClick={openModal}
      >
        <Pencil size={16} />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
            onClick={closeModal}
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-700 transition-colors shadow-sm cursor-pointer"
                aria-label={t("cancel")}
              >
                <X size={18} />
              </button>

              <div className="p-5">
                <div className="text-sm font-medium text-stone-900">{t("edit_guest_title")}</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t("guest_name")}</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                      placeholder={t("guest_name_placeholder")}
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t("guest_phone")}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 dir-ltr text-start font-mono"
                      disabled={pending}
                    />
                  </div>
                  {guestsEnabled && (
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">{t("col_invite_count")}</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        inputMode="numeric"
                        value={inviteCountInput}
                        onChange={(e) => setInviteCountInput(e.target.value)}
                        onBlur={() => {
                          const trimmed = inviteCountInput.trim();
                          if (trimmed === "") {
                            setInviteCountInput("1");
                            return;
                          }
                          const n = Number(trimmed);
                          if (!Number.isFinite(n) || !Number.isInteger(n)) return;
                          const clamped = Math.max(1, Math.min(50, n));
                          setInviteCountInput(String(clamped));
                        }}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                        disabled={pending}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={pending}
                    className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm hover:bg-stone-800 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                    {pending ? t("saving") : t("save_changes")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function GuestListClient({
  guests,
  eventId,
  guestsEnabled = false,
  qrEnabled = false,
  onGuestDeleted,
  onGuestUpdated,
  onGuestsAdded,
  pagination,
  onPageChange,
  isLoading,
  searchQuery = "",
  hasFilters = false,
}: {
  guests: GuestRowData[];
  eventId: string;
  guestsEnabled?: boolean;
  qrEnabled?: boolean;
  onGuestDeleted: (guestId: string) => void;
  onGuestUpdated: (guest: GuestRowData) => void;
  onGuestsAdded?: (guests: GuestRowData[]) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  searchQuery?: string;
  hasFilters?: boolean;
}) {
  const t = useTranslations("Dashboard");
  const isSearching = searchQuery.trim() !== "" || hasFilters;
  const showSkeleton = Boolean(isLoading) && guests.length === 0;

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden divide-y divide-stone-100">
        {showSkeleton && (
          <div className="divide-y divide-stone-100">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-3 animate-pulse" aria-hidden="true">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-stone-200 rounded" />
                    <div className="h-3 w-1/3 bg-stone-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-stone-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 bg-stone-200 rounded" />
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-stone-200 rounded-md" />
                    <div className="h-8 w-8 bg-stone-200 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence
          initial={false}
        >
          {guests.map((guest) => {
            const statusBadge = getStatusBadge(t, guest.status);
            const canDelete = guest.status === "pending" || guest.status === "failed";
            const canEdit = guest.status === "pending" || guest.status === "failed";
            return (
              <motion.div
                key={guest.id}
                layout
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="p-4 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-stone-900">{guest.name}</div>
                    <div className="text-xs text-stone-500 dir-ltr text-start rtl:text-end">
                      {guest.phone}
                    </div>
                    {guestsEnabled && guest.inviteCount && (
                      <div className="text-xs text-stone-500 mt-0.5">
                        {guest.inviteCount} {guest.inviteCount === 1 ? t("invite_count_singular") : t("invite_count_plural")}
                      </div>
                    )}
                  </div>
                  {statusBadge}
                </div>

                <div className="flex items-center justify-between mt-1">
                  {qrEnabled ? (
                    <div>
                      {guest.status === "declined" ? (
                        <span className="text-stone-300 text-xs">-</span>
                      ) : guest.checkedIn ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-xs font-medium">{t("qr_checked_in")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-stone-400">
                          <Circle size={12} />
                          <span className="text-xs">{t("qr_not_arrived")}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <EditButton
                        guest={guest}
                        guestsEnabled={!!guestsEnabled}
                        onUpdated={onGuestUpdated}
                      />
                    )}
                    {canDelete && (
                      <DeleteButton guestId={guest.id} onDeleted={() => onGuestDeleted(guest.id)} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!showSkeleton && guests.length === 0 && (
          isSearching ? (
            <NoResultsState t={t} searchQuery={searchQuery} />
          ) : (
            <EmptyState t={t} eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} />
          )
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-stone-50 text-xs text-stone-500 font-medium">
            <tr>
              <th className="px-6 py-3 text-start">{t("col_name")}</th>
              <th className="px-6 py-3 text-start">{t("col_phone")}</th>
              {guestsEnabled && <th className="px-6 py-3 text-start">{t("col_invite_count")}</th>}
              <th className="px-6 py-3 text-start">{t("col_status")}</th>
              {qrEnabled && <th className="px-6 py-3 text-start">{t("col_qr")}</th>}
              <th className="px-6 py-3 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            {showSkeleton && (
              <>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`sk-${idx}`} className="animate-pulse" aria-hidden="true">
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 bg-stone-200 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-36 bg-stone-200 rounded" />
                    </td>
                    {guestsEnabled && (
                      <td className="px-6 py-4">
                        <div className="h-3 w-12 bg-stone-200 rounded" />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-stone-200 rounded-full" />
                    </td>
                    {qrEnabled && (
                      <td className="px-6 py-4">
                        <div className="h-3 w-24 bg-stone-200 rounded" />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 bg-stone-200 rounded-md" />
                        <div className="h-8 w-8 bg-stone-200 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}

            <AnimatePresence
              initial={false}
            >
              {guests.map((guest) => {
                const statusBadge = getStatusBadge(t, guest.status);
                const canDelete = guest.status === "pending" || guest.status === "failed";
                const canEdit = guest.status === "pending" || guest.status === "failed";
                return (
                  <motion.tr
                    key={guest.id}
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-stone-900">{guest.name}</td>
                    <td className="px-6 py-4 dir-ltr ltr:text-start rtl:text-end text-stone-500 font-mono">
                      {guest.phone}
                    </td>
                    {guestsEnabled && (
                      <td className="px-6 py-4 text-stone-700">
                        {guest.inviteCount || 1}
                      </td>
                    )}
                    <td className="px-6 py-4">{statusBadge}</td>
                    {qrEnabled && (
                      <td className="px-6 py-4">
                        {guest.status === "declined" ? (
                          <span className="text-stone-300">-</span>
                        ) : guest.checkedIn ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 size={14} />
                            <span className="text-xs font-medium">{t("qr_checked_in")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Circle size={12} />
                            <span className="text-xs">{t("qr_not_arrived")}</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <div className="scale-[0.92] origin-right">
                            <EditButton
                              guest={guest}
                              guestsEnabled={!!guestsEnabled}
                              onUpdated={onGuestUpdated}
                            />
                          </div>
                        )}
                        {canDelete && (
                          <div className="scale-[0.92] origin-right">
                            <DeleteButton
                              guestId={guest.id}
                              onDeleted={() => onGuestDeleted(guest.id)}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {!showSkeleton && guests.length === 0 && (
              <tr>
                <td colSpan={4 + (guestsEnabled ? 1 : 0) + (qrEnabled ? 1 : 0)}>
                  {isSearching ? (
                    <NoResultsState t={t} searchQuery={searchQuery} />
                  ) : (
                    <EmptyState t={t} eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <PaginationControls
          pagination={pagination}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

