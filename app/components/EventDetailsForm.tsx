"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  MapPin,
  Trash2,
  Info,
  X,
} from "lucide-react";

import InvitePreview from "./InvitePreview";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { uploadEventMedia, validateFileType, type MediaType } from "@/lib/supabase/storage";
import { formatGoogleMapsLink } from "@/lib/maps";
import { type InviteMediaType, type WhatsAppTextViolation, MAX_INVITE_MESSAGE_CHARS, countMessageChars, renderInviteMessage, validateWhatsAppText } from "@/lib/inviteMessage";
import { isVendorMode } from "@/lib/vendorClient";
import {
  formatEventDate as formatDateFromPicker,
  formatEventTime as formatTimeFromPicker,
} from "@/lib/utils/formatEventDateTime";

const violationKeys: Record<WhatsAppTextViolation, string> = {
  newline: "errors.message_invalid_newline",
  tab: "errors.message_invalid_tab",
  spaces: "errors.message_invalid_spaces",
};

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const t = useTranslations("Common");
    return (
      <div className="h-full w-full bg-stone-100 flex items-center justify-center text-xs text-stone-500">
        {t("loading_map")}
      </div>
    );
  },
});

export type EventDetails = {
  eventName: string;
  date: string;
  /** Raw YYYY-MM-DD value from the date picker (undefined for free-text dates) */
  eventDate?: string;
  time: string;
  location: string;
  locationName: string;
  message: string;
  messageLocale: "en" | "ar";
  qrEnabled: boolean;
  guestsEnabled: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  imageUrl: string;
  mediaType: MediaType | undefined;
  mediaFilename: string;
  mediaSize: number;
};

export type EventDetailsFormProps = {
  initialDetails?: Partial<EventDetails>;
  initialCustomerEmail?: string;
  initialCanSendInvites?: boolean;
  /** Labels for invitee preview (used for rendered message length calc) */
  invites?: { name: string; inviteCount: number }[];
  /** Show the vendor customer settings block */
  showVendorSettings?: boolean;
  /** Called when the form passes validation */
  onSubmit: (data: {
    details: EventDetails;
    customerEmail: string;
    canSendInvites: boolean;
  }) => void;
  /** Text for the submit button */
  submitLabel: string;
  /** Optional: show a loading spinner on the submit button */
  isSubmitting?: boolean;
  /** Externally disable the submit button (e.g. when no changes) */
  submitDisabled?: boolean;
  /** Fires when the form's dirty state changes (true = has unsaved changes) */
  onDirtyChange?: (dirty: boolean) => void;
  /** Content to render in the footer area next to the submit button */
  footerExtra?: React.ReactNode;
  /** When true, the reminder has already been sent and timing cannot be changed */
  reminderSent?: boolean;
};

export default function EventDetailsForm({
  initialDetails,
  initialCustomerEmail = "",
  initialCanSendInvites = false,
  invites: externalInvites,
  showVendorSettings = false,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  submitDisabled = false,
  onDirtyChange,
  footerExtra,
  reminderSent = false,
}: EventDetailsFormProps) {
  const t = useTranslations("Wizard");
  const tPreview = useTranslations("InvitePreview");
  const locale = useLocale() as "en" | "ar";

  const [isUploading, setIsUploading] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"link" | "map">("link");
  const [dateMode, setDateMode] = useState<"picker" | "custom">(
    initialDetails?.date ? "custom" : "picker"
  );
  const [timeMode, setTimeMode] = useState<"picker" | "custom">(
    initialDetails?.time ? "custom" : "picker"
  );
  const [datePickerValue, setDatePickerValue] = useState("");
  const [timePickerValue, setTimePickerValue] = useState("");
  const [details, setDetails] = useState<EventDetails>({
    eventName: "",
    date: "",
    eventDate: undefined,
    time: "",
    location: "",
    locationName: "",
    message: "",
    messageLocale: locale,
    qrEnabled: true,
    guestsEnabled: false,
    reminderEnabled: true,
    reminderDaysBefore: 1,
    imageUrl: "",
    mediaType: undefined,
    mediaFilename: "",
    mediaSize: 0,
    ...initialDetails,
  });

  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [canSendInvites, setCanSendInvites] = useState(initialCanSendInvites);

  // Dirty tracking: compare current form values against initial snapshot
  const initialSnapshot = useRef({
    eventName: details.eventName,
    date: details.date,
    time: details.time,
    location: details.location,
    locationName: details.locationName,
    message: details.message,
    messageLocale: details.messageLocale,
    qrEnabled: details.qrEnabled,
    guestsEnabled: details.guestsEnabled,
    reminderEnabled: details.reminderEnabled,
    reminderDaysBefore: details.reminderDaysBefore,
    imageUrl: details.imageUrl,
    mediaType: details.mediaType,
    customerEmail: initialCustomerEmail,
    canSendInvites: initialCanSendInvites,
  });

  const isDirty = useMemo(() => {
    const snap = initialSnapshot.current;
    return (
      details.eventName !== snap.eventName ||
      details.date !== snap.date ||
      details.time !== snap.time ||
      details.location !== snap.location ||
      details.locationName !== snap.locationName ||
      details.message !== snap.message ||
      details.messageLocale !== snap.messageLocale ||
      details.qrEnabled !== snap.qrEnabled ||
      details.guestsEnabled !== snap.guestsEnabled ||
      details.reminderEnabled !== snap.reminderEnabled ||
      details.reminderDaysBefore !== snap.reminderDaysBefore ||
      details.imageUrl !== snap.imageUrl ||
      details.mediaType !== snap.mediaType ||
      customerEmail !== snap.customerEmail ||
      canSendInvites !== snap.canSendInvites
    );
  }, [details, customerEmail, canSendInvites]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const invites = externalInvites ?? [{ name: "", inviteCount: 1 }];

  const messageTextLength = useMemo(
    () => countMessageChars(details.message || ""),
    [details.message]
  );

  const baseRenderedMessageLength = useMemo(() => {
    try {
      const fallbackInvitee = tPreview("default_invitee");
      const inviteeFromList = invites.find((i) =>
        String(i.name || "").trim()
      )?.name;
      const invitee = String(inviteeFromList || fallbackInvitee || "").trim();

      const inviteCount = invites.reduce(
        (max, i) => Math.max(max, Number(i.inviteCount || 1)),
        2
      );

      const renderedBase = renderInviteMessage({
        locale: details.messageLocale,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        mediaType: (details.mediaType ?? "image") as InviteMediaType,
        invitee,
        greetingText: "",
        date: details.date || tPreview("default_date"),
        time: details.time || "",
        locationName:
          details.locationName || tPreview("default_location_name"),
        inviteCount,
      });

      return countMessageChars(renderedBase);
    } catch {
      return 0;
    }
  }, [
    details.messageLocale,
    details.qrEnabled,
    details.guestsEnabled,
    details.mediaType,
    details.date,
    details.time,
    details.locationName,
    invites,
    tPreview,
  ]);

  const maxMessageTextChars = useMemo(() => {
    return Math.max(0, MAX_INVITE_MESSAGE_CHARS - baseRenderedMessageLength);
  }, [baseRenderedMessageLength]);

  const renderedMessageLength = useMemo(() => {
    try {
      if (!details.message.trim()) return 0;

      const fallbackInvitee = tPreview("default_invitee");
      const inviteeFromList = invites.find((i) =>
        String(i.name || "").trim()
      )?.name;
      const invitee = String(inviteeFromList || fallbackInvitee || "").trim();

      const inviteCount = invites.reduce(
        (max, i) => Math.max(max, Number(i.inviteCount || 1)),
        2
      );

      const rendered = renderInviteMessage({
        locale: details.messageLocale,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        mediaType: (details.mediaType ?? "image") as InviteMediaType,
        invitee,
        greetingText: details.message,
        date: details.date || tPreview("default_date"),
        time: details.time || "",
        locationName:
          details.locationName || tPreview("default_location_name"),
        inviteCount,
      });

      return countMessageChars(rendered);
    } catch {
      return countMessageChars(details.message || "");
    }
  }, [
    details.message,
    details.messageLocale,
    details.qrEnabled,
    details.guestsEnabled,
    details.mediaType,
    details.date,
    details.time,
    details.locationName,
    invites,
    tPreview,
  ]);

  const renderedFullMessage = useMemo(() => {
    try {
      const fallbackInvitee = tPreview("default_invitee");
      const inviteeFromList = invites.find((i) =>
        String(i.name || "").trim()
      )?.name;
      const invitee = String(inviteeFromList || fallbackInvitee || "").trim();

      const inviteCount = invites.reduce(
        (max, i) => Math.max(max, Number(i.inviteCount || 1)),
        2
      );

      return renderInviteMessage({
        locale: details.messageLocale,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        mediaType: (details.mediaType ?? "image") as InviteMediaType,
        invitee,
        greetingText: details.message || "",
        date: details.date || "",
        time: details.time || "",
        locationName: details.locationName || "",
        inviteCount,
      });
    } catch {
      return details.message || "";
    }
  }, [
    details.message,
    details.messageLocale,
    details.qrEnabled,
    details.guestsEnabled,
    details.mediaType,
    details.date,
    details.time,
    details.locationName,
    invites,
    tPreview,
  ]);

  const renderedFullMessageHighlighted = useMemo(() => {
    const greeting = String(details.message || "");
    const full = String(renderedFullMessage || "");
    const trimmed = greeting.trim();
    if (!trimmed) {
      return { before: full, match: "", after: "", hasMatch: false };
    }
    const idx = full.indexOf(greeting);
    if (idx === -1) {
      return { before: full, match: "", after: "", hasMatch: false };
    }
    return {
      before: full.slice(0, idx),
      match: full.slice(idx, idx + greeting.length),
      after: full.slice(idx + greeting.length),
      hasMatch: true,
    };
  }, [details.message, renderedFullMessage]);

  // Sync messageLocale with page locale when it changes (only on initial mount for wizard)
  useEffect(() => {
    if (!initialDetails?.messageLocale) {
      setDetails((prev) => ({ ...prev, messageLocale: locale }));
    }
  }, [locale, initialDetails?.messageLocale]);

  // Re-format picker date/time when messageLocale changes
  useEffect(() => {
    setDetails((prev) => {
      const updates: Partial<typeof prev> = {};
      if (dateMode === "picker" && datePickerValue) {
        updates.date = formatDateFromPicker(datePickerValue, prev.messageLocale);
      }
      if (timeMode === "picker" && timePickerValue) {
        updates.time = formatTimeFromPicker(timePickerValue, prev.messageLocale);
      }
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.messageLocale, dateMode, datePickerValue, timeMode, timePickerValue]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isMobilePreviewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobilePreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobilePreviewOpen]);

  useEffect(() => {
    if (validationError && Object.keys(errors).length === 0) {
      setValidationError(null);
    }
  }, [errors, validationError]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setUploadError(null);

    const validation = validateFileType(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file type");
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadEventMedia(file);

      if (!result.success || !result.publicUrl) {
        setUploadError(result.error || "Upload failed");
        return;
      }

      setDetails((prev) => ({
        ...prev,
        imageUrl: result.publicUrl!,
        mediaType: result.mediaType,
        mediaFilename: file.name,
        mediaSize: file.size,
      }));
      setErrors((prev) => {
        if (!prev.imageUrl) return prev;
        const next = { ...prev };
        delete next.imageUrl;
        return next;
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!details.eventName.trim()) newErrors.eventName = t("errors.required");
    if (!details.imageUrl) newErrors.imageUrl = t("errors.required");
    if (!details.message.trim()) {
      newErrors.message = t("errors.required");
    } else {
      const violation = validateWhatsAppText(details.message);
      if (violation) {
        newErrors.message = t(violationKeys[violation]);
      } else if (renderedMessageLength > MAX_INVITE_MESSAGE_CHARS) {
        newErrors.message = t("errors.message_too_long", {
          max: MAX_INVITE_MESSAGE_CHARS,
        });
      }
    }
    if (!details.date) newErrors.date = t("errors.required");
    if (!details.eventDate) newErrors.eventDate = t("errors.required");
    if (!details.time) newErrors.time = t("errors.required");
    if (!details.locationName.trim())
      newErrors.locationName = t("errors.required");
    const googleMapsRegex =
      /^https:\/\/maps\.google\.com\/\?q=-?\d+\.\d+,-?\d+\.\d+/;
    if (!details.location.trim()) {
      newErrors.location = t("errors.required");
    } else if (!googleMapsRegex.test(details.location)) {
      newErrors.location = t("errors.invalid_map_link");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    const ok = validate();
    if (ok) {
      setValidationError(null);
      onSubmit({ details, customerEmail, canSendInvites });
    } else {
      setValidationError(t("errors.fix_above"));
    }
  };

  const imageErrorText = uploadError || errors.imageUrl;
  const imageHasError = Boolean(imageErrorText && !details.imageUrl);

  return (
    <div className="animate-slide-up pb-32 lg:pb-0">
      <div className="grid lg:grid-cols-5 gap-12">
        {/* Main Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image/Document Upload */}
          <div
            className={`bg-white p-6 rounded-xl border shadow-sm space-y-4 ${
              imageHasError
                ? "border-red-300 ring-2 ring-red-100"
                : "border-stone-200"
            }`}
          >
            <h3 className="text-sm font-medium text-stone-900">
              {t("step2.image_upload")}
            </h3>

            {imageHasError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                <span className="mt-0.5 text-red-600">
                  <Info size={14} />
                </span>
                <span>
                  {t("step2.image_upload")}: {t("errors.required")}
                </span>
              </div>
            )}

            {details.imageUrl ? (
              <div className="border border-stone-200 rounded-lg p-4 bg-stone-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center">
                      {details.mediaType === "document" ? (
                        <span className="text-xs font-bold text-stone-500">
                          PDF
                        </span>
                      ) : (
                        <UploadCloud size={18} className="text-stone-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900 truncate max-w-[200px]">
                        {details.mediaFilename || "Uploaded file"}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {details.mediaType === "document"
                          ? "PDF Document"
                          : "Image"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setDetails((prev) => ({
                        ...prev,
                        imageUrl: "",
                        mediaType: undefined,
                        mediaFilename: "",
                      }))
                    }
                    className="text-stone-400 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer group block ${
                  isUploading
                    ? "border-stone-300 bg-stone-50"
                    : "border-stone-200 hover:bg-stone-50"
                } ${
                  uploadError || errors.imageUrl
                    ? "border-red-300 bg-red-50/40"
                    : ""
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleMediaUpload}
                  disabled={isUploading}
                />
                <div
                  className={`w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 transition-transform ${
                    isUploading ? "animate-pulse" : "group-hover:scale-110"
                  }`}
                >
                  <UploadCloud size={20} className="text-stone-400" />
                </div>
                <p className="text-xs font-medium text-stone-900">
                  {isUploading ? "Uploading..." : t("step2.click_upload")}
                </p>
                <p className="text-[10px] text-stone-500 mt-1">
                  JPG, PNG (Max: 5MB), PDF (Max: 10MB)
                </p>
                {(uploadError || errors.imageUrl) && (
                  <p className="text-[10px] text-red-500 mt-2">
                    {uploadError || errors.imageUrl}
                  </p>
                )}
              </label>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
            {/* Message Language */}
            <div>
              <label className="text-xs font-medium text-stone-700 mb-1.5 block">
                {locale === "ar" ? "لغة الرسالة" : "Message Language"}
              </label>
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() =>
                    setDetails((prev) => ({ ...prev, messageLocale: "en" }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    details.messageLocale === "en"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDetails((prev) => ({ ...prev, messageLocale: "ar" }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    details.messageLocale === "ar"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>

            {/* Message Text */}
            <div>
              <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                <span>
                  {t("step2.message_label")}{" "}
                  <span className="text-red-500">*</span>
                </span>
                {errors.message && (
                  <span className="text-red-500 text-[10px]">
                    {errors.message}
                  </span>
                )}
              </label>
              <textarea
                rows={4}
                value={details.message}
                placeholder={t("step2.default_message")}
                onChange={(e) => {
                  setDetails({ ...details, message: e.target.value });
                  const violation = validateWhatsAppText(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (violation) {
                      const vKeys: Record<WhatsAppTextViolation, string> = {
                        newline: "errors.message_invalid_newline",
                        tab: "errors.message_invalid_tab",
                        spaces: "errors.message_invalid_spaces",
                      };
                      next.message = t(vKeys[violation]);
                    } else {
                      delete next.message;
                    }
                    return next;
                  });
                }}
                className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm focus:bg-white focus:border-stone-400 outline-none transition-all resize-none ${
                  errors.message ? "border-red-300" : "border-stone-200"
                }`}
              />
              <div className="mt-1.5 flex justify-end">
                <span
                  className={`text-[10px] ${
                    renderedMessageLength > MAX_INVITE_MESSAGE_CHARS
                      ? "text-red-500"
                      : "text-stone-500"
                  }`}
                >
                  {messageTextLength}/{maxMessageTextChars}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 flex items-start gap-2">
                <span className="mt-0.5 text-stone-500">
                  <Info size={14} />
                </span>
                <div className="leading-relaxed">
                  <div className="font-semibold text-stone-800">
                    {t("step2.auto_adds_title")}
                  </div>
                  <div className="text-[11px] text-stone-600">
                    {t("step2.auto_adds_desc")}
                  </div>
                </div>
              </div>

              <details className="mt-3 rounded-lg border border-stone-200 bg-white overflow-hidden group">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-stone-800 flex items-center justify-between hover:bg-stone-50">
                  <span>{t("step2.full_message_summary")}</span>
                  <span className="text-stone-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-1">
                  <div
                    className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 whitespace-pre-wrap wrap-break-word"
                    dir="auto"
                  >
                    {renderedFullMessageHighlighted.before}
                    {renderedFullMessageHighlighted.hasMatch && (
                      <mark className="rounded px-1 bg-yellow-200/70 text-stone-900">
                        {renderedFullMessageHighlighted.match}
                      </mark>
                    )}
                    {renderedFullMessageHighlighted.hasMatch
                      ? renderedFullMessageHighlighted.after
                      : ""}
                  </div>
                  <div className="mt-2 text-[10px] text-stone-500">
                    {t("step2.full_message_hint")}
                  </div>
                </div>
              </details>
            </div>

            {/* Event Name */}
            <div>
              <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                <span>
                  {t("step2.event_name_label")}{" "}
                  <span className="text-red-500">*</span>
                </span>
                {errors.eventName && (
                  <span className="text-red-500 text-[10px]">
                    {errors.eventName}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={details.eventName}
                onChange={(e) => {
                  setDetails({ ...details, eventName: e.target.value });
                  if (errors.eventName)
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.eventName;
                      return next;
                    });
                }}
                placeholder={t("step2.event_name_placeholder")}
                className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                  errors.eventName ? "border-red-300" : "border-stone-200"
                }`}
              />
              <p className="text-[10px] text-stone-500 mt-1.5">
                {t("step2.event_name_hint")}
              </p>
            </div>

            {/* Date / Time */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-700 flex">
                    {t("step2.date_label")}{" "}
                    <span className="text-red-500 ml-1">*</span>
                    {errors.date && (
                      <span className="text-red-500 text-[10px] ml-2 font-normal">
                        {errors.date}
                      </span>
                    )}
                  </label>
                  <div className="flex bg-stone-100 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setDateMode("picker")}
                      className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                        dateMode === "picker"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {t("step2.calendar_btn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode("custom")}
                      className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                        dateMode === "custom"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {t("step2.text_btn")}
                    </button>
                  </div>
                </div>
                {dateMode === "picker" ? (
                  <input
                    type="date"
                    value={datePickerValue}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDatePickerValue(raw);
                      setDetails({
                        ...details,
                        date: raw
                          ? formatDateFromPicker(raw, details.messageLocale)
                          : "",
                        eventDate: raw || undefined,
                      });
                      if (errors.date)
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.date;
                          return next;
                        });
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 ${
                      errors.date ? "border-red-300" : "border-stone-200"
                    }`}
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={details.date}
                      onChange={(e) => {
                        setDetails({ ...details, date: e.target.value });
                        if (errors.date)
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.date;
                            return next;
                          });
                      }}
                      placeholder={t("step2.date_placeholder")}
                      className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                        errors.date ? "border-red-300" : "border-stone-200"
                      }`}
                    />
                    <div>
                      <label className="text-[10px] text-stone-400 mb-0.5 flex">
                        {t("step2.actual_date_label")}
                        <span className="text-red-500 ml-1">*</span>
                        {errors.eventDate && (
                          <span className="text-red-500 text-[10px] ml-2 font-normal">
                            {errors.eventDate}
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={details.eventDate || ""}
                        onChange={(e) => {
                          setDetails({ ...details, eventDate: e.target.value || undefined });
                          if (errors.eventDate)
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.eventDate;
                              return next;
                            });
                        }}
                        className={`w-full px-4 py-2 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 ${
                          errors.eventDate ? "border-red-300" : "border-stone-200"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-700 flex">
                    {t("step2.time_label")}{" "}
                    <span className="text-red-500 ml-1">*</span>
                    {errors.time && (
                      <span className="text-red-500 text-[10px] ml-2 font-normal">
                        {errors.time}
                      </span>
                    )}
                  </label>
                  <div className="flex bg-stone-100 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setTimeMode("picker")}
                      className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                        timeMode === "picker"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {t("step2.clock_btn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode("custom")}
                      className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                        timeMode === "custom"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {t("step2.text_btn")}
                    </button>
                  </div>
                </div>
                {timeMode === "picker" ? (
                  <input
                    type="time"
                    value={timePickerValue}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTimePickerValue(raw);
                      setDetails({
                        ...details,
                        time: raw
                          ? formatTimeFromPicker(raw, details.messageLocale)
                          : "",
                      });
                      if (errors.time)
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.time;
                          return next;
                        });
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 ${
                      errors.time ? "border-red-300" : "border-stone-200"
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    value={details.time}
                    onChange={(e) => {
                      setDetails({ ...details, time: e.target.value });
                      if (errors.time)
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.time;
                          return next;
                        });
                    }}
                    placeholder={t("step2.time_placeholder")}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                      errors.time ? "border-red-300" : "border-stone-200"
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Location Name */}
            <div>
              <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                <span>
                  {t("step2.location_name_label")}{" "}
                  <span className="text-red-500">*</span>
                </span>
                {errors.locationName && (
                  <span className="text-red-500 text-[10px]">
                    {errors.locationName}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={details.locationName}
                onChange={(e) => {
                  setDetails({ ...details, locationName: e.target.value });
                  if (errors.locationName)
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.locationName;
                      return next;
                    });
                }}
                placeholder={t("step2.location_name_placeholder")}
                className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                  errors.locationName ? "border-red-300" : "border-stone-200"
                }`}
              />
            </div>

            {/* Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-700 flex">
                  {t("step2.location_label")}{" "}
                  <span className="text-red-500 ml-1">*</span>
                  {errors.location && (
                    <span className="text-red-500 text-[10px] ml-2 font-normal">
                      {errors.location}
                    </span>
                  )}
                </label>
                <div className="flex bg-stone-100 rounded-md p-0.5">
                  <button
                    onClick={() => setMapMode("link")}
                    className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                      mapMode === "link"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {t("step2.link_btn")}
                  </button>
                  <button
                    onClick={() => setMapMode("map")}
                    className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                      mapMode === "map"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {t("step2.map_btn")}
                  </button>
                </div>
              </div>

              {mapMode === "link" ? (
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-stone-400">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="url"
                    value={details.location}
                    onChange={(e) => {
                      const formattedValue = formatGoogleMapsLink(
                        e.target.value
                      );
                      setDetails({ ...details, location: formattedValue });
                      if (errors.location)
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.location;
                          return next;
                        });
                    }}
                    placeholder="https://maps.google.com/..."
                    className={`w-full pr-9 pl-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all dir-ltr ${
                      errors.location ? "border-red-300" : "border-stone-200"
                    }`}
                  />
                </div>
              ) : (
                <div
                  className={`relative h-64 bg-stone-100 rounded-lg border overflow-hidden group ${
                    errors.location ? "border-red-300" : "border-stone-200"
                  }`}
                >
                  <MapPicker
                    onLocationSelect={(lat: number, lng: number) => {
                      setDetails({
                        ...details,
                        location: `https://maps.google.com/?q=${lat},${lng}`,
                      });
                      if (errors.location)
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.location;
                          return next;
                        });
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-stone-900">
                  {t("step2.qr_toggle")}
                </div>
                <div className="text-[11px] text-stone-500">
                  {t("step2.qr_desc")}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={details.qrEnabled}
                  onChange={(e) =>
                    setDetails({ ...details, qrEnabled: e.target.checked })
                  }
                  className="sr-only peer custom-checkbox"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
              </label>
            </div>
            <hr className="border-stone-100" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-stone-900">
                  {t("step2.guests_toggle")}
                </div>
                <div className="text-[11px] text-stone-500">
                  {t("step2.guests_desc")}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={details.guestsEnabled}
                  onChange={(e) =>
                    setDetails({ ...details, guestsEnabled: e.target.checked })
                  }
                  className="sr-only peer custom-checkbox"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
              </label>
            </div>
            <hr className="border-stone-100" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-stone-900">
                    {t("step2.reminder_toggle")}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {t("step2.reminder_desc")}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={details.reminderEnabled}
                    onChange={(e) =>
                      setDetails({ ...details, reminderEnabled: e.target.checked })
                    }
                    className="sr-only peer custom-checkbox"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                </label>
              </div>
              {details.reminderEnabled && (() => {
                const daysUntilEvent = details.eventDate
                  ? Math.ceil((new Date(details.eventDate + "T00:00:00").getTime() - new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00").getTime()) / 86400000)
                  : Infinity;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-stone-500 whitespace-nowrap">
                        {t("step2.reminder_days_label")}
                      </label>
                      <select
                        value={details.reminderDaysBefore}
                        disabled={reminderSent}
                        onChange={(e) =>
                          setDetails({ ...details, reminderDaysBefore: Number(e.target.value) })
                        }
                        className={`px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-700 outline-none ${
                          reminderSent ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {[1, 2, 3, 5, 7].map((d) => (
                          <option key={d} value={d} disabled={d >= daysUntilEvent}>
                            {t("step2.reminder_days_option", { count: d })}
                          </option>
                        ))}
                      </select>
                    </div>
                    {reminderSent && (
                      <p className="text-[10px] text-amber-600">
                        {t("step2.reminder_already_sent")}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Vendor Customer Settings */}
          {showVendorSettings && isVendorMode && (
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="text-sm font-medium text-stone-900">
                {locale === "ar" ? "إعدادات العميل" : "Customer Settings"}
              </h3>
              <div>
                <label className="text-xs font-medium text-stone-700 mb-1.5 block">
                  {locale === "ar"
                    ? "البريد الإلكتروني للعميل"
                    : "Customer Email"}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:bg-white focus:border-stone-400 transition-all dir-ltr text-left"
                />
                <p className="text-[10px] text-stone-500 mt-1.5">
                  {locale === "ar"
                    ? "سيتمكن العميل من تسجيل الدخول بهذا البريد لمتابعة الدعوات"
                    : "The customer will sign in with this email to track their RSVPs"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-stone-900">
                    {locale === "ar"
                      ? "السماح بإرسال الدعوات"
                      : "Allow Sending Invites"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {locale === "ar"
                      ? "السماح للعميل بإرسال الدعوات عبر واتساب"
                      : "Allow the customer to send invites via WhatsApp"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canSendInvites}
                    onChange={(e) => setCanSendInvites(e.target.checked)}
                    className="sr-only peer custom-checkbox"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                </label>
              </div>
            </div>
          )}

          {/* Footer: Submit + extras */}
          <div className="pt-4">
            <div className="hidden lg:flex items-center justify-between gap-3">
              {footerExtra ?? <div />}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || submitDisabled}
                className="bg-stone-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submitLabel}</span>
              </button>
            </div>

            {validationError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {validationError}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info - Live Preview */}
        <div className="hidden lg:block lg:col-span-2 sticky top-24 h-fit">
          <div className="flex justify-center">
            <InvitePreview
              title={details.eventName}
              date={details.date}
              time={details.time}
              locationName={details.locationName}
              location={details.location}
              message={details.message}
              imageUrl={details.imageUrl}
              mediaType={details.mediaType}
              mediaFilename={details.mediaFilename}
              mediaSize={details.mediaSize}
              showQr={details.qrEnabled}
              guestsEnabled={details.guestsEnabled}
              reminderEnabled={details.reminderEnabled}
              locale={details.messageLocale}
            />
          </div>
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4 text-center">
            {t("step2.live_preview")}
          </h4>
        </div>
      </div>

      {/* Mobile: sticky actions (Preview + Submit) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-linear-to-t from-stone-50 via-stone-50/95 to-transparent">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsMobilePreviewOpen(true)}
            className="w-full bg-white text-stone-900 py-3 rounded-xl font-medium text-sm border border-stone-200 hover:bg-stone-50 transition-colors shadow-sm"
          >
            {t("step2.open_preview")}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || submitDisabled}
            className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-stone-800 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{submitLabel}</span>
          </button>
        </div>
      </div>

      {/* Mobile: preview modal */}
      {mounted &&
        isMobilePreviewOpen &&
        createPortal(
          <div className="fixed inset-0 z-9999 lg:hidden">
            <button
              type="button"
              aria-label={t("step2.close_preview")}
              onClick={() => setIsMobilePreviewOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto relative z-10 w-full max-w-[560px] max-h-[90vh] rounded-2xl bg-stone-50 border border-stone-200 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">
                      {t("step2.preview_sheet_title")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobilePreviewOpen(false)}
                    className="p-2 -m-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    aria-label={t("step2.close_preview")}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-56px)] px-4 pb-6 pt-4">
                  <div className="flex justify-center">
                    <div className="w-full max-w-[400px]">
                      <InvitePreview
                        title={details.eventName}
                        date={details.date}
                        time={details.time}
                        locationName={details.locationName}
                        location={details.location}
                        message={details.message}
                        imageUrl={details.imageUrl}
                        mediaType={details.mediaType}
                        mediaFilename={details.mediaFilename}
                        mediaSize={details.mediaSize}
                        showQr={details.qrEnabled}
                        guestsEnabled={details.guestsEnabled}
                        reminderEnabled={details.reminderEnabled}
                        locale={details.messageLocale}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
