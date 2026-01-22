"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteGuest as deleteGuestServerAction } from "@/app/[locale]/dashboard/actions";
import AddGuestForm from "@/app/components/AddGuestForm";

export type GuestRowData = {
  id: string;
  name: string;
  phone: string;
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
  className,
  tooltip,
}: {
  status: string;
  label: string;
  className: string;
  tooltip: string;
}) {
  return (
    <div className="relative group cursor-help inline-block">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border shadow-sm transition-colors ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 rtl:mr-0 rtl:ml-1.5 ${
            status === "confirmed"
              ? "bg-green-500"
              : status === "declined"
                ? "bg-red-500"
                : status === "read"
                  ? "bg-blue-600"
                  : status === "delivered"
                    ? "bg-teal-500"
                    : status === "sent"
                      ? "bg-sky-500"
                      : status === "failed"
                        ? "bg-red-500"
                        : status === "pending"
                          ? "bg-amber-500"
                          : "bg-stone-400"
          }`}
        ></span>
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
          className="bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
        />
      );
    case "declined":
      return (
        <StatusPill
          status="declined"
          label={t("status_declined")}
          tooltip={t("tooltip_declined")}
          className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
        />
      );
    case "sent":
      return (
        <StatusPill
          status="sent"
          label={t("status_sent")}
          tooltip={t("tooltip_sent")}
          className="bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100"
        />
      );
    case "delivered":
      return (
        <StatusPill
          status="delivered"
          label={t("status_delivered")}
          tooltip={t("tooltip_delivered")}
          className="bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
        />
      );
    case "read":
      return (
        <StatusPill
          status="read"
          label={t("status_read")}
          tooltip={t("tooltip_read")}
          className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
        />
      );
    case "failed":
      return (
        <StatusPill
          status="failed"
          label={t("status_failed")}
          tooltip={t("tooltip_failed")}
          className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
        />
      );
    case "pending":
      return (
        <StatusPill
          status="pending"
          label={t("status_pending")}
          tooltip={t("tooltip_pending")}
          className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
        />
      );
    default:
      return (
        <StatusPill
          status="no_reply"
          label={t("status_no_reply")}
          tooltip={t("tooltip_no_reply")}
          className="bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
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
      className={`text-stone-400 hover:text-red-600 p-2 border border-stone-100 rounded-md hover:border-red-100 hover:bg-red-50 transition-colors ${
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
  onGuestsAdded,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  eventId: string;
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
        <AddGuestForm eventId={eventId} onGuestsAdded={onGuestsAdded} />
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
  return (
    <div className="px-6 py-16 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
        <Search className="text-stone-300" size={32} />
      </div>
      <h3 className="text-stone-900 font-medium mb-1">
        {t("no_results_title") || "No Results Found"}
      </h3>
      <p className="text-stone-500 text-sm max-w-xs mx-auto">
        {t("no_results_desc", { query: searchQuery }) ||
          `No guests match "${searchQuery}". Try a different search term.`}
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
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                } disabled:opacity-60`}
              >
                {pageNum}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!pagination.hasNextPage || isLoading}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={t("next_page") || "Next page"}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function GuestListClient({
  guests,
  eventId,
  onGuestDeleted,
  onGuestsAdded,
  pagination,
  onPageChange,
  isLoading,
  searchQuery = "",
}: {
  guests: GuestRowData[];
  eventId: string;
  onGuestDeleted: (guestId: string) => void;
  onGuestsAdded?: (guests: GuestRowData[]) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  searchQuery?: string;
}) {
  const t = useTranslations("Dashboard");
  const [showEmpty, setShowEmpty] = useState(guests.length === 0);
  const isSearching = searchQuery.trim() !== "";

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden divide-y divide-stone-100">
        <AnimatePresence
          initial={false}
          onExitComplete={() => {
            if (guests.length === 0) setShowEmpty(true);
          }}
        >
          {guests.map((guest) => {
            const statusBadge = getStatusBadge(t, guest.status);
            const canDelete = guest.status === "pending" || guest.status === "failed";
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
                    <div className="text-xs text-stone-500 dir-ltr">{guest.phone}</div>
                  </div>
                  {statusBadge}
                </div>

                <div className="flex items-center justify-between mt-1">
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

                  <div className="flex items-center gap-2">
                    {canDelete && (
                      <DeleteButton guestId={guest.id} onDeleted={() => onGuestDeleted(guest.id)} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {guests.length === 0 && showEmpty && (
          isSearching ? (
            <NoResultsState t={t} searchQuery={searchQuery} />
          ) : (
            <EmptyState t={t} eventId={eventId} onGuestsAdded={onGuestsAdded} />
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
              <th className="px-6 py-3 text-start">{t("col_status")}</th>
              <th className="px-6 py-3 text-start">{t("col_qr")}</th>
              <th className="px-6 py-3 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            <AnimatePresence
              initial={false}
              onExitComplete={() => {
                if (guests.length === 0) setShowEmpty(true);
              }}
            >
              {guests.map((guest) => {
                const statusBadge = getStatusBadge(t, guest.status);
                const canDelete = guest.status === "pending" || guest.status === "failed";
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
                    <td className="px-6 py-4 dir-ltr text-start text-stone-500 font-mono">
                      {guest.phone}
                    </td>
                    <td className="px-6 py-4">{statusBadge}</td>
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
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
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

            {guests.length === 0 && showEmpty && (
              <tr>
                <td colSpan={5}>
                  {isSearching ? (
                    <NoResultsState t={t} searchQuery={searchQuery} />
                  ) : (
                    <EmptyState t={t} eventId={eventId} onGuestsAdded={onGuestsAdded} />
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

