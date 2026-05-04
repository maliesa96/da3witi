"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import EventDetailsForm, { type EventDetails } from "./EventDetailsForm";
import { isVendorMode } from "@/lib/vendorClient";
import type { MediaType } from "@/lib/supabase/storage";

type EditableEvent = {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  locationName: string | null;
  message: string | null;
  qrEnabled: boolean;
  guestsEnabled: boolean;
  reminderEnabled: boolean;
  imageUrl: string | null;
  mediaType: string | null;
  mediaFilename: string | null;
  locale: string | null;
  customerEmail?: string | null;
  customerPermissions?: { canSendInvites?: boolean } | null;
};

export default function EditEventDialog({
  event,
  isVendorAdmin,
  open,
  onClose,
  onSaved,
}: {
  event: EditableEvent;
  isVendorAdmin: boolean;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const initialDetails: Partial<EventDetails> = {
    eventName: event.title || "",
    date: event.date || "",
    time: event.time || "",
    location: event.location || "",
    locationName: event.locationName || "",
    message: event.message || "",
    messageLocale: (event.locale as "en" | "ar") || (locale as "en" | "ar"),
    qrEnabled: event.qrEnabled,
    guestsEnabled: event.guestsEnabled,
    reminderEnabled: event.reminderEnabled,
    imageUrl: event.imageUrl || "",
    mediaType: (event.mediaType as MediaType) || undefined,
    mediaFilename: event.mediaFilename || "",
    mediaSize: 0,
  };

  const handleSubmit = async (data: {
    details: EventDetails;
    customerEmail: string;
    canSendInvites: boolean;
  }) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.details.eventName || "Event",
          date: data.details.date,
          time: data.details.time,
          location: data.details.location,
          locationName: data.details.locationName,
          message: data.details.message,
          qrEnabled: data.details.qrEnabled,
          guestsEnabled: data.details.guestsEnabled,
          reminderEnabled: data.details.reminderEnabled,
          imageUrl: data.details.imageUrl,
          mediaType: data.details.mediaType,
          mediaFilename: data.details.mediaFilename,
          locale: data.details.messageLocale,
          ...(isVendorMode && isVendorAdmin
            ? {
                customerEmail: data.customerEmail || undefined,
                customerPermissions: {
                  canSendInvites: data.canSendInvites,
                },
              }
            : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update event");
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to update event:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to update event"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999">
      <button
        type="button"
        aria-label={t("edit_event_close")}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 pt-8 md:pt-16">
          <div
            role="dialog"
            aria-modal="true"
            className="pointer-events-auto relative z-10 w-full max-w-7xl rounded-2xl bg-stone-50 border border-stone-200 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-stone-900">
                {t("edit_event_title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -m-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                aria-label={t("edit_event_close")}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {saveError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <EventDetailsForm
                initialDetails={initialDetails}
                initialCustomerEmail={event.customerEmail || ""}
                initialCanSendInvites={
                  event.customerPermissions?.canSendInvites ?? false
                }
                showVendorSettings={isVendorAdmin}
                submitLabel={
                  isSaving
                    ? t("edit_event_saving")
                    : t("edit_event_save")
                }
                isSubmitting={isSaving}
                submitDisabled={!isDirty}
                onDirtyChange={setIsDirty}
                onSubmit={handleSubmit}
                footerExtra={
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all"
                  >
                    {t("edit_event_cancel")}
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
