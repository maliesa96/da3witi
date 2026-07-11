"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
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
import { useLocale, useTranslations } from "next-intl";

import {
  deleteGuest as deleteGuestServerAction,
  updateGuest as updateGuestServerAction,
  sendNoReplyReminder as sendNoReplyReminderAction,
} from "@/app/[locale]/dashboard/actions";
import AddGuestForm from "@/app/components/AddGuestForm";
import { parseGuestError, guestErrorMessage } from "@/lib/utils/guestErrors";

export type GuestRowData = {
  id: string;
  name: string;
  phone: string;
  inviteCount?: number;
  inviteSide?: string | null;
  status: string;
  checkedIn: boolean;
  whatsappMessageId: string | null;
  sentAt?: string | null;
  noReplyReminderSentAt?: string | null;
  noReplyReminderDeliveredAt?: string | null;
  noReplyReminderReadAt?: string | null;
  noReplyReminderFailedAt?: string | null;
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
  guestName,
  guestStatus,
  onDeleted,
}: {
  guestId: string;
  guestName: string;
  guestStatus: string;
  onDeleted: () => void;
}) {
  const t = useTranslations("Dashboard");
  const [pending, setPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const needsWarning = guestStatus !== "pending" && guestStatus !== "failed";

  const statusLabels: Record<string, string> = {
    pending: t("status_pending"),
    sent: t("status_sent"),
    delivered: t("status_delivered"),
    read: t("status_read"),
    confirmed: t("status_present"),
    declined: t("status_declined"),
    failed: t("status_failed"),
    no_reply: t("status_no_reply"),
  };

  const handleDelete = async () => {
    setPending(true);
    try {
      await deleteGuestServerAction(guestId);
      setShowConfirm(false);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete guest:", err);
      alert("Failed to delete guest. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={`text-stone-400 hover:text-red-600 p-2 border border-stone-100 rounded-md hover:border-red-100 hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${
          pending ? "opacity-60 cursor-not-allowed" : ""
        }`}
        title={t("delete_guest")}
        aria-label={t("delete_guest")}
        onClick={() => {
          if (needsWarning) {
            setShowConfirm(true);
          } else {
            handleDelete();
          }
        }}
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>

      {showConfirm &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
            onClick={() => !pending && setShowConfirm(false)}
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-900">{t("delete_guest_confirm_title")}</div>
                    <div className="text-xs text-stone-500">{t("delete_all_subtitle")}</div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                  <p className="text-xs text-amber-800 font-medium mb-1">{guestName}</p>
                  <p className="text-xs text-amber-700">
                    {t("delete_guest_confirm_warning", { status: statusLabels[guestStatus] || guestStatus })}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={pending}
                    className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={pending}
                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                    {pending ? t("deleting") : t("delete_guest_confirm_btn")}
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

function EmptyState({
  t,
  eventId,
  guestsEnabled,
  onGuestsAdded,
  readOnly = false,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  eventId: string;
  guestsEnabled?: boolean;
  onGuestsAdded?: (guests: GuestRowData[]) => void;
  readOnly?: boolean;
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
      {!readOnly && (
        <div className="w-full max-w-[200px] mx-auto flex justify-center">
          <AddGuestForm eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} />
        </div>
      )}
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

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

type ReminderState = "hidden" | "too_early" | "ready" | "awaiting" | "delivered" | "failed" | "timed_out";

function getReminderState(guest: GuestRowData): ReminderState {
  const eligibleStatuses = ["sent", "delivered", "read"];
  if (!eligibleStatuses.includes(guest.status)) return "hidden";
  if (!guest.sentAt) return "hidden";

  const hoursSinceSent = Date.now() - new Date(guest.sentAt).getTime();
  if (hoursSinceSent < TWENTY_FOUR_HOURS_MS) return "too_early";

  if (!guest.noReplyReminderSentAt) return "ready";

  if (guest.noReplyReminderFailedAt) return "failed";
  if (guest.noReplyReminderDeliveredAt || guest.noReplyReminderReadAt) return "delivered";

  const hoursSinceReminder = Date.now() - new Date(guest.noReplyReminderSentAt).getTime();
  if (hoursSinceReminder >= TWELVE_HOURS_MS) return "timed_out";

  return "awaiting";
}

function ReminderButton({
  guest,
  onUpdated,
}: {
  guest: GuestRowData;
  onUpdated: (guest: GuestRowData) => void;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale() as "en" | "ar";
  const [pending, setPending] = useState(false);
  const state = getReminderState(guest);

  if (state === "hidden") return null;

  const handleSend = async () => {
    setPending(true);
    try {
      await sendNoReplyReminderAction(guest.id, locale);
      onUpdated({
        ...guest,
        noReplyReminderSentAt: new Date().toISOString(),
        noReplyReminderDeliveredAt: null,
        noReplyReminderReadAt: null,
        noReplyReminderFailedAt: null,
      });
    } catch (err) {
      console.error("Failed to send reminder:", err);
    } finally {
      setPending(false);
    }
  };

  const isDisabled = state === "too_early" || state === "awaiting" || state === "delivered";
  const isClickable = state === "ready" || state === "failed" || state === "timed_out";

  let title: string;
  let iconColor: string;
  let borderColor: string;
  let hoverClasses: string;

  switch (state) {
    case "too_early":
      title = t("reminder_available_after_24h");
      iconColor = "text-stone-300";
      borderColor = "border-stone-100";
      hoverClasses = "";
      break;
    case "ready":
      title = t("send_reminder");
      iconColor = "text-stone-400";
      borderColor = "border-stone-100";
      hoverClasses = "hover:text-amber-600 hover:border-amber-100 hover:bg-amber-50";
      break;
    case "awaiting":
      title = t("reminder_awaiting_delivery");
      iconColor = "text-amber-400";
      borderColor = "border-amber-100";
      hoverClasses = "";
      break;
    case "delivered":
      title = t("reminder_delivered");
      iconColor = "text-green-500";
      borderColor = "border-green-100";
      hoverClasses = "";
      break;
    case "failed":
      title = t("reminder_failed_retry");
      iconColor = "text-red-500";
      borderColor = "border-red-100";
      hoverClasses = "hover:text-red-700 hover:border-red-200 hover:bg-red-50";
      break;
    case "timed_out":
      title = t("reminder_timed_out");
      iconColor = "text-stone-400";
      borderColor = "border-stone-100";
      hoverClasses = "hover:text-amber-600 hover:border-amber-100 hover:bg-amber-50";
      break;
  }

  return (
    <button
      type="button"
      disabled={isDisabled || pending}
      className={`${iconColor} p-2 border ${borderColor} rounded-md transition-colors ${
        isClickable && !pending ? `cursor-pointer ${hoverClasses}` : "cursor-not-allowed"
      } ${pending ? "opacity-60" : ""}`}
      title={title}
      aria-label={title}
      onClick={isClickable ? handleSend : undefined}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : state === "delivered" ? (
        <BellRing size={16} />
      ) : (
        <Bell size={16} />
      )}
    </button>
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
  const tErr = useTranslations("GuestErrors");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  // Keep as text so users can clear and type (e.g. replace "1" with "2")
  const [inviteCountInput, setInviteCountInput] = useState<string>(String(guest.inviteCount || 1));
  const [inviteSide, setInviteSide] = useState<string | null>(guest.inviteSide ?? null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = () => {
    setError(null);
    setName(guest.name);
    setPhone(guest.phone);
    setInviteCountInput(String(guest.inviteCount || 1));
    setInviteSide(guest.inviteSide ?? null);
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
        inviteSide,
      });
      if (res?.success && res.guest) {
        onUpdated(res.guest as GuestRowData);
        setOpen(false);
      } else {
        setError(t("edit_guest_save_failed"));
      }
    } catch (err) {
      setError(guestErrorMessage(parseGuestError(err), tErr));
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
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t("col_invited_by")}</label>
                    <select
                      value={inviteSide ?? ''}
                      onChange={(e) => setInviteSide(e.target.value || null)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                      disabled={pending}
                    >
                      <option value="">{t("side_unassigned")}</option>
                      <option value="bride">{t("side_bride")}</option>
                      <option value="groom">{t("side_groom")}</option>
                    </select>
                  </div>

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

function SideBadge({ side, t }: { side: string | null | undefined; t: (key: string) => string }) {
  if (!side) return null;
  const isBride = side === 'bride';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
      isBride 
        ? 'bg-pink-50 text-pink-600 border border-pink-200' 
        : 'bg-blue-50 text-blue-600 border border-blue-200'
    }`}>
      {isBride ? t('side_badge_bride') : t('side_badge_groom')}
    </span>
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
  readOnly = false,
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
  readOnly?: boolean;
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
            const canDelete = !readOnly;
            const canEdit = !readOnly && (guest.status === "pending" || guest.status === "failed");
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
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-stone-900">{guest.name}</div>
                      <SideBadge side={guest.inviteSide} t={t} />
                    </div>
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
                    {!readOnly && (
                      <ReminderButton guest={guest} onUpdated={onGuestUpdated} />
                    )}
                    {canEdit && (
                      <EditButton
                        guest={guest}
                        guestsEnabled={!!guestsEnabled}
                        onUpdated={onGuestUpdated}
                      />
                    )}
                    {canDelete && (
                      <DeleteButton guestId={guest.id} guestName={guest.name} guestStatus={guest.status} onDeleted={() => onGuestDeleted(guest.id)} />
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
            <EmptyState t={t} eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} readOnly={readOnly} />
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
              <th className="px-6 py-3 text-start w-24"></th>
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
                const canDelete = !readOnly;
                const canEdit = !readOnly && (guest.status === "pending" || guest.status === "failed");
                return (
                  <motion.tr
                    key={guest.id}
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-stone-900">
                      <div className="flex items-center gap-2">
                        {guest.name}
                        <SideBadge side={guest.inviteSide} t={t} />
                      </div>
                    </td>
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
                        {!readOnly && (
                          <div className="scale-[0.92] origin-right">
                            <ReminderButton guest={guest} onUpdated={onGuestUpdated} />
                          </div>
                        )}
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
                              guestName={guest.name}
                              guestStatus={guest.status}
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
                    <EmptyState t={t} eventId={eventId} guestsEnabled={guestsEnabled} onGuestsAdded={onGuestsAdded} readOnly={readOnly} />
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

