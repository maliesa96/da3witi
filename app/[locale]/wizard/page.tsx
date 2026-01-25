"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  UploadCloud,
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  FileSpreadsheet,
  Info,
} from "lucide-react";

import InvitePreview from "../../components/InvitePreview";
import ContactImport from "../../components/ContactImport";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { uploadEventMedia, validateFileType, type MediaType } from "@/lib/supabase/storage";
import { formatGoogleMapsLink } from "@/lib/maps";
import { normalizePhoneToE164 } from "@/lib/phone";
import { type InviteMediaType, MAX_INVITE_MESSAGE_CHARS, countMessageChars, renderInviteMessage } from "@/lib/inviteMessage";

const MapPicker = dynamic(() => import("../../components/MapPicker"), {
  ssr: false,
  loading: () => {
     // eslint-disable-next-line react-hooks/rules-of-hooks
     const t = useTranslations('Common');
     return (
        <div className="h-full w-full bg-stone-100 flex items-center justify-center text-xs text-stone-500">
        {t('loading_map')}
        </div>
    )
  },
});

export default function Wizard() {
  const t = useTranslations('Wizard');
  const tPreview = useTranslations('InvitePreview');
  const locale = useLocale() as 'en' | 'ar';
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step1ValidationError, setStep1ValidationError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"link" | "map">("link");
  const [dateMode, setDateMode] = useState<"picker" | "custom">("picker");
  const [timeMode, setTimeMode] = useState<"picker" | "custom">("picker");
  const [datePickerValue, setDatePickerValue] = useState("");
  const [timePickerValue, setTimePickerValue] = useState("");
  const [details, setDetails] = useState({
    eventName: "",
    date: "",
    time: "",
    location: "",
    locationName: "",
    message: "",
    messageLocale: locale as 'en' | 'ar',
    qrEnabled: true,
    guestsEnabled: false,
    reminderEnabled: true,
    isScheduled: false,
    scheduledDate: "",
    scheduledTime: "",
    imageUrl: "",
    mediaType: undefined as MediaType | undefined,
    mediaFilename: "",
    mediaSize: 0
  });
  
  const [inviteMode, setInviteMode] = useState<"file" | "manual">("file");
  const [invites, setInvites] = useState([{ name: "", phone: "", inviteCount: 1 }]);

  const messageTextLength = useMemo(() => countMessageChars(details.message || ""), [details.message]);

  const baseRenderedMessageLength = useMemo(() => {
    try {
      const fallbackInvitee = tPreview("default_invitee");
      const inviteeFromList = invites.find(i => String(i.name || "").trim())?.name;
      const invitee = String(inviteeFromList || fallbackInvitee || "").trim();

      const inviteCount = invites.reduce((max, i) => Math.max(max, Number(i.inviteCount || 1)), 2);

      const renderedBase = renderInviteMessage({
        locale: details.messageLocale,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        mediaType: (details.mediaType ?? "image") as InviteMediaType,
        invitee,
        greetingText: "",
        date: details.date || tPreview("default_date"),
        time: details.time || "",
        locationName: details.locationName || tPreview("default_location_name"),
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
      const inviteeFromList = invites.find(i => String(i.name || "").trim())?.name;
      const invitee = String(inviteeFromList || fallbackInvitee || "").trim();

      const inviteCount = invites.reduce((max, i) => Math.max(max, Number(i.inviteCount || 1)), 2);

      const rendered = renderInviteMessage({
        locale: details.messageLocale,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        mediaType: (details.mediaType ?? "image") as InviteMediaType,
        invitee,
        greetingText: details.message,
        date: details.date || tPreview("default_date"),
        time: details.time || "",
        locationName: details.locationName || tPreview("default_location_name"),
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

  // Sync messageLocale with page locale when it changes
  useEffect(() => {
    setDetails(prev => ({ ...prev, messageLocale: locale }));
  }, [locale]);

  useEffect(() => {
    if (step1ValidationError && Object.keys(errors).length === 0) {
      setStep1ValidationError(null);
    }
  }, [errors, step1ValidationError]);

  // State for ContactImport to persist across tab switches
  const [importData, setImportData] = useState<(string | number | null)[][]>([]);
  const [importNameCol, setImportNameCol] = useState<number | null>(null);
  const [importPhoneCol, setImportPhoneCol] = useState<number | null>(null);
  const [importInviteCountCol, setImportInviteCountCol] = useState<number | null>(null);
  const [importStartRow, setImportStartRow] = useState(0);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const addManualInvite = () => {
    setInvites([...invites, { name: "", phone: "", inviteCount: 1 }]);
  };

  const updateManualInvite = (index: number, field: "name" | "phone" | "inviteCount", value: string | number) => {
    const newInvites = [...invites];
    if (field === "inviteCount") {
      newInvites[index][field] = typeof value === "number" ? value : parseInt(value, 10) || 1;
    } else {
      newInvites[index][field] = value as string;
    }
    setInvites(newInvites);
  };

  const validateAndNormalizeInvites = () => {
    const next = invites.map((inv) => ({
      ...inv,
      name: String(inv.name || "").trim(),
      phone: String(inv.phone || "").trim(),
    }));

    for (let i = 0; i < next.length; i++) {
      const name = next[i].name;
      if (name && name.length < 2) {
        alert(t("errors.name_too_short"));
        return { ok: false as const };
      }
      const phone = next[i].phone;
      if (!phone) continue; // optional step; validate only when provided
      const res = normalizePhoneToE164(phone);
      if (!res.ok) {
        alert(t("errors.invalid_phone"));
        return { ok: false as const };
      }
      next[i].phone = res.phone;
    }

    setInvites(next);
    return { ok: true as const, invites: next };
  };

  const removeManualInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const handleContactsLoaded = (loadedContacts: { name: string; phone: string; inviteCount?: number }[]) => {
    setInvites(loadedContacts.map(c => ({ ...c, inviteCount: c.inviteCount || 1 })));
    setInviteMode("manual"); // Switch to manual to show the list after import
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setUploadError(null);
    
    // Validate file type first
    const validation = validateFileType(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file type');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const result = await uploadEventMedia(file);
      
      if (!result.success || !result.publicUrl) {
        setUploadError(result.error || 'Upload failed');
        return;
      }
      
      setDetails(prev => ({
        ...prev,
        imageUrl: result.publicUrl!,
        mediaType: result.mediaType,
        mediaFilename: file.name,
        mediaSize: file.size
      }));
      setErrors(prev => {
        if (!prev.imageUrl) return prev;
        const next = { ...prev };
        delete next.imageUrl;
        return next;
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDateFromPicker = (value: string) => {
    // value: "YYYY-MM-DD"
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return value;
    const date = new Date(Date.UTC(y, m - 1, d));
    const intlLocale = locale === "ar" ? "ar-SA" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  const formatTimeFromPicker = (value: string) => {
    // value: "HH:MM"
    const [hh, mm] = value.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return value;
    const date = new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
    const intlLocale = locale === "ar" ? "ar-SA" : "en-US";
    const base: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      hour12: true,
      timeZone: "UTC",
    };
    // If minutes are 00, omit them: "5 PM" not "5:00 PM"
    const opts: Intl.DateTimeFormatOptions =
      mm === 0 ? base : { ...base, minute: "2-digit" };
    return new Intl.DateTimeFormat(intlLocale, opts).format(date);
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!details.imageUrl) newErrors.imageUrl = t('errors.required');
    if (!details.message.trim()) newErrors.message = t('errors.required');
    if (!details.date) newErrors.date = t('errors.required');
    if (!details.time) newErrors.time = t('errors.required');
    if (!details.locationName.trim()) newErrors.locationName = t('errors.required');
    const googleMapsRegex = /^https:\/\/maps\.google\.com\/\?q=-?\d+\.\d+,-?\d+\.\d+/;
    if (!details.location.trim()) {
      newErrors.location = t('errors.required');
    } else if (!googleMapsRegex.test(details.location)) {
      newErrors.location = t('errors.invalid_map_link');
    }
    
    if (details.isScheduled) {
      if (!details.scheduledDate) newErrors.scheduledDate = t('errors.required');
      if (!details.scheduledTime) newErrors.scheduledTime = t('errors.required');
    }

    // Enforce final rendered message length (template wrapper + parameters included)
    if (details.message.trim() && renderedMessageLength > MAX_INVITE_MESSAGE_CHARS) {
      newErrors.message = t('errors.message_too_long', { max: MAX_INVITE_MESSAGE_CHARS });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateEvent = async () => {
    setIsSubmitting(true);
    try {
      const { createEvent } = await import('./actions');
      const normalized = validateAndNormalizeInvites();
      if (!normalized.ok) {
        setIsSubmitting(false);
        return;
      }
      const result = await createEvent({
        title: details.eventName || "Event",
        date: details.date,
        time: details.time,
        location: details.location,
        locationName: details.locationName,
        message: details.message,
        qrEnabled: details.qrEnabled,
        guestsEnabled: details.guestsEnabled,
        reminderEnabled: details.reminderEnabled,
        isScheduled: details.isScheduled,
        scheduledAt: details.isScheduled ? `${details.scheduledDate}T${details.scheduledTime}` : undefined,
        imageUrl: details.imageUrl,
        mediaType: details.mediaType,
        mediaFilename: details.mediaFilename,
        guests: normalized.invites.filter(i => i.name && i.phone),
        locale: details.messageLocale
      });

      if (result.success) {
        // Redirect to dashboard with the new event
        window.location.href = `/${details.messageLocale}/dashboard?eventId=${result.eventId}`;
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      console.error('Event creation failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('INVALID_PHONE')) {
        alert(t('errors.invalid_phone'));
      } else if (msg.includes('NAME_TOO_SHORT')) {
        alert(t('errors.name_too_short'));
      } else if (msg.includes('MESSAGE_TOO_LONG')) {
        alert(t('errors.message_too_long', { max: MAX_INVITE_MESSAGE_CHARS }));
      } else {
        alert('Failed to create event. Please try again.');
      }
      setIsSubmitting(false);
    }
  };


  const imageErrorText = uploadError || errors.imageUrl;
  const imageHasError = Boolean(imageErrorText && !details.imageUrl);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24">
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-12 relative max-w-2xl mx-auto">
        <div className="absolute top-1/2 left-0 w-full h-px bg-stone-200 -z-10"></div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-stone-50 px-2 flex flex-col items-center gap-2 cursor-default select-none"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step
                  ? "bg-stone-900 text-white"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {i}
            </div>
            <span
              className={`text-[10px] font-medium ${
                i <= step ? "text-stone-900" : "text-stone-500"
              }`}
            >
              {i === 1
                ? t('steps.details')
                : i === 2
                ? t('steps.guests')
                : t('steps.create')}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: OPTIONS */}
      {step === 1 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">
              {t('step2.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step2.desc')}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12">
            {/* Main Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Image/Document Upload */}
              <div
                className={`bg-white p-6 rounded-xl border shadow-sm space-y-4 ${
                  imageHasError ? "border-red-300 ring-2 ring-red-100" : "border-stone-200"
                }`}
              >
                <h3 className="text-sm font-medium text-stone-900">
                  {t('step2.image_upload')}
                </h3>

                {imageHasError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                    <span className="mt-0.5 text-red-600">
                      <Info size={14} />
                    </span>
                    <span>
                      {t('step2.image_upload')}: {t('errors.required')}
                    </span>
                  </div>
                )}
                
                {details.imageUrl ? (
                  <div className="border border-stone-200 rounded-lg p-4 bg-stone-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center">
                          {details.mediaType === 'document' ? (
                            <span className="text-xs font-bold text-stone-500">PDF</span>
                          ) : (
                            <UploadCloud size={18} className="text-stone-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 truncate max-w-[200px]">
                            {details.mediaFilename || 'Uploaded file'}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {details.mediaType === 'document' ? 'PDF Document' : 'Image'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setDetails(prev => ({ 
                          ...prev, 
                          imageUrl: '', 
                          mediaType: undefined, 
                          mediaFilename: '' 
                        }))}
                        className="text-stone-400 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer group block ${
                    isUploading ? 'border-stone-300 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
                  } ${(uploadError || errors.imageUrl) ? 'border-red-300 bg-red-50/40' : ''}`}>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp,application/pdf" 
                      className="hidden" 
                      onChange={handleMediaUpload}
                      disabled={isUploading}
                    />
                    <div className={`w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 transition-transform ${
                      isUploading ? 'animate-pulse' : 'group-hover:scale-110'
                    }`}>
                      <UploadCloud size={20} className="text-stone-400" />
                    </div>
                    <p className="text-xs font-medium text-stone-900">
                      {isUploading ? 'Uploading...' : t('step2.click_upload')}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-1">
                      JPG, PNG, PDF (Max: 5MB)
                    </p>
                    {(uploadError || errors.imageUrl) && (
                      <p className="text-[10px] text-red-500 mt-2">{uploadError || errors.imageUrl}</p>
                    )}
                  </label>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                {/* Message Language */}
                <div>
                  <label className="text-xs font-medium text-stone-700 mb-1.5 block">
                    {locale === 'ar' ? 'لغة الرسالة' : 'Message Language'}
                  </label>
                  <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setDetails(prev => ({ ...prev, messageLocale: 'en' }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        details.messageLocale === 'en'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetails(prev => ({ ...prev, messageLocale: 'ar' }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        details.messageLocale === 'ar'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      العربية
                    </button>
                  </div>
                </div>

                {/* Message Text */}
                <div>
                  <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                    <span>{t('step2.message_label')} <span className="text-red-500">*</span></span>
                    {errors.message && <span className="text-red-500 text-[10px]">{errors.message}</span>}
                  </label>
                  <textarea
                    rows={4}
                    value={details.message}
                    placeholder={t('step2.default_message')}
                    onChange={(e) => {
                      setDetails({ ...details, message: e.target.value });
                      // Keep message error in sync with length requirement
                      setErrors(prev => {
                        const next = { ...prev };
                        // Clear any existing message error; validateStep2 will re-set on next action
                        delete next.message;
                        return next;
                      });
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm focus:bg-white focus:border-stone-400 outline-none transition-all resize-none ${
                      errors.message ? 'border-red-300' : 'border-stone-200'
                    }`}
                  />
                  <div className="mt-1.5 flex justify-end">
                    <span className={`text-[10px] ${renderedMessageLength > MAX_INVITE_MESSAGE_CHARS ? 'text-red-500' : 'text-stone-500'}`}>
                      {messageTextLength}/{maxMessageTextChars}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                    <span>{t('step2.event_name_label')}</span>
                    {errors.eventName && <span className="text-red-500 text-[10px]">{errors.eventName}</span>}
                  </label>
                  <input
                    type="text"
                    value={details.eventName}
                    onChange={(e) => {
                      setDetails({ ...details, eventName: e.target.value });
                      if (errors.eventName) setErrors(prev => {
                        const next = { ...prev };
                        delete next.eventName;
                        return next;
                      });
                    }}
                    placeholder={t('step2.event_name_placeholder')}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                      errors.eventName ? 'border-red-300' : 'border-stone-200'
                    }`}
                  />
                  <p className="text-[10px] text-stone-500 mt-1.5">
                    {t('step2.event_name_hint')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-stone-700 flex">
                        {t('step2.date_label')} <span className="text-red-500 ml-1">*</span>
                        {errors.date && <span className="text-red-500 text-[10px] ml-2 font-normal">{errors.date}</span>}
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
                          {t('step2.calendar_btn')}
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
                          {t('step2.text_btn')}
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
                          setDetails({ ...details, date: raw ? formatDateFromPicker(raw) : "" });
                          if (errors.date) setErrors(prev => {
                            const next = { ...prev };
                            delete next.date;
                            return next;
                          });
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 ${
                          errors.date ? 'border-red-300' : 'border-stone-200'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={details.date}
                        onChange={(e) => {
                          setDetails({ ...details, date: e.target.value });
                          if (errors.date) setErrors(prev => {
                            const next = { ...prev };
                            delete next.date;
                            return next;
                          });
                        }}
                        placeholder={t('step2.date_placeholder')}
                        className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                          errors.date ? 'border-red-300' : 'border-stone-200'
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-stone-700 flex">
                        {t('step2.time_label')} <span className="text-red-500 ml-1">*</span>
                        {errors.time && <span className="text-red-500 text-[10px] ml-2 font-normal">{errors.time}</span>}
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
                          {t('step2.clock_btn')}
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
                          {t('step2.text_btn')}
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
                          setDetails({ ...details, time: raw ? formatTimeFromPicker(raw) : "" });
                          if (errors.time) setErrors(prev => {
                            const next = { ...prev };
                            delete next.time;
                            return next;
                          });
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 ${
                          errors.time ? 'border-red-300' : 'border-stone-200'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={details.time}
                        onChange={(e) => {
                          setDetails({ ...details, time: e.target.value });
                          if (errors.time) setErrors(prev => {
                            const next = { ...prev };
                            delete next.time;
                            return next;
                          });
                        }}
                        placeholder={t('step2.time_placeholder')}
                        className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                          errors.time ? 'border-red-300' : 'border-stone-200'
                        }`}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                    <span>{t('step2.location_name_label')} <span className="text-red-500">*</span></span>
                    {errors.locationName && <span className="text-red-500 text-[10px]">{errors.locationName}</span>}
                  </label>
                  <input
                    type="text"
                    value={details.locationName}
                    onChange={(e) => {
                      setDetails({ ...details, locationName: e.target.value });
                      if (errors.locationName) setErrors(prev => {
                        const next = { ...prev };
                        delete next.locationName;
                        return next;
                      });
                    }}
                    placeholder={t('step2.location_name_placeholder')}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all ${
                      errors.locationName ? 'border-red-300' : 'border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-stone-700 flex">
                      {t('step2.location_label')} <span className="text-red-500 ml-1">*</span>
                      {errors.location && <span className="text-red-500 text-[10px] ml-2 font-normal">{errors.location}</span>}
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
                        {t('step2.link_btn')}
                      </button>
                      <button
                        onClick={() => setMapMode("map")}
                        className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                          mapMode === "map"
                            ? "bg-white text-stone-900 shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                        }`}
                      >
                        {t('step2.map_btn')}
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
                          const formattedValue = formatGoogleMapsLink(e.target.value);
                          setDetails({ ...details, location: formattedValue });
                          if (errors.location) setErrors(prev => {
                            const next = { ...prev };
                            delete next.location;
                            return next;
                          });
                        }}
                        placeholder="https://maps.google.com/..."
                        className={`w-full pr-9 pl-4 py-2.5 rounded-lg bg-stone-50 border text-sm outline-none focus:bg-white focus:border-stone-400 transition-all dir-ltr ${
                          errors.location ? 'border-red-300' : 'border-stone-200'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className={`relative h-64 bg-stone-100 rounded-lg border overflow-hidden group ${
                      errors.location ? 'border-red-300' : 'border-stone-200'
                    }`}>
                      <MapPicker
                        onLocationSelect={(lat: number, lng: number) => {
                          setDetails({ ...details, location: `https://maps.google.com/?q=${lat},${lng}` });
                          if (errors.location) setErrors(prev => {
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

              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                {/* Toggle Item */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {t('step2.qr_toggle')}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {t('step2.qr_desc')}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={details.qrEnabled}
                      onChange={(e) => setDetails({ ...details, qrEnabled: e.target.checked })}
                      className="sr-only peer custom-checkbox"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                  </label>
                </div>
                <hr className="border-stone-100" />
                {/* Toggle Item: Enable Guests */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {t('step2.guests_toggle')}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {t('step2.guests_desc')}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={details.guestsEnabled}
                      onChange={(e) => setDetails({ ...details, guestsEnabled: e.target.checked })}
                      className="sr-only peer custom-checkbox"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                  </label>
                </div>
                <hr className="border-stone-100" />
                {/* Toggle Item */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {t('step2.reminder_toggle')}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {t('step2.reminder_desc')}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={details.reminderEnabled}
                      onChange={(e) => setDetails({ ...details, reminderEnabled: e.target.checked })}
                      className="sr-only peer custom-checkbox"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                  </label>
                </div>
                <hr className="border-stone-100" />
                {/* Toggle Item: Schedule Send */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-stone-900">
                        {t('step2.schedule_toggle')}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {t('step2.schedule_desc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={details.isScheduled}
                        onChange={(e) => setDetails({ ...details, isScheduled: e.target.checked })}
                        className="sr-only peer custom-checkbox"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                    </label>
                  </div>

                  {details.isScheduled && (
                    <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex justify-between">
                          <span>{t('step2.scheduled_date')} <span className="text-red-500">*</span></span>
                          {errors.scheduledDate && <span className="text-red-500 text-[10px] normal-case">{errors.scheduledDate}</span>}
                        </label>
                        <input
                          type="date"
                          value={details.scheduledDate}
                          onChange={(e) => {
                            setDetails({ ...details, scheduledDate: e.target.value });
                            if (errors.scheduledDate) setErrors(prev => {
                              const next = { ...prev };
                              delete next.scheduledDate;
                              return next;
                            });
                          }}
                          className={`w-full px-4 py-2 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 focus:bg-white focus:border-stone-400 transition-all ${
                            errors.scheduledDate ? 'border-red-300' : 'border-stone-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex justify-between">
                          <span>{t('step2.scheduled_time')} <span className="text-red-500">*</span></span>
                          {errors.scheduledTime && <span className="text-red-500 text-[10px] normal-case">{errors.scheduledTime}</span>}
                        </label>
                        <input
                          type="time"
                          value={details.scheduledTime}
                          onChange={(e) => {
                            setDetails({ ...details, scheduledTime: e.target.value });
                            if (errors.scheduledTime) setErrors(prev => {
                              const next = { ...prev };
                              delete next.scheduledTime;
                              return next;
                            });
                          }}
                          className={`w-full px-4 py-2 rounded-lg bg-stone-50 border text-sm outline-none text-stone-600 focus:bg-white focus:border-stone-400 transition-all ${
                            errors.scheduledTime ? 'border-red-300' : 'border-stone-200'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const ok = validateStep2();
                      if (ok) {
                        setStep1ValidationError(null);
                        setStep(2);
                      } else {
                        setStep1ValidationError(t("errors.fix_above"));
                      }
                    }}
                    className="bg-stone-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2"
                  >
                    <span>{t('step1.next')}</span>
                    <ArrowRight size={16} className="rtl:rotate-180" />
                  </button>
                </div>

                {step1ValidationError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {step1ValidationError}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Info - Live Preview */}
            <div className="hidden lg:block lg:col-span-2 sticky top-24 h-fit">
               <div className="scale-90 xl:scale-100 origin-top flex justify-center">
                 <InvitePreview 
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
                    locale={details.messageLocale}
                 />
               </div>
               <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4 text-center">
                  {t('step2.live_preview')}
               </h4>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INVITE LIST */}
      {step === 2 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">
              {t('step1.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step1.desc')}
            </p>

            {/* Make it obvious this step is optional */}
            <div className="mt-5 max-w-2xl mx-auto">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-start">
                <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Info size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-stone-900">
                    {t('step1.optional_title')}
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    {t('step1.optional_note')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 transition-colors"
                >
                  {t('step1.skip_cta')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm max-w-4xl mx-auto">
            <div className="flex border-b border-stone-100">
              <button
                onClick={() => setInviteMode("file")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  inviteMode === "file"
                    ? "text-stone-900 border-b-2 border-stone-900 bg-stone-50"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t('step1.tab_file')}
              </button>
              <button
                onClick={() => setInviteMode("manual")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  inviteMode === "manual"
                    ? "text-stone-900 border-b-2 border-stone-900 bg-stone-50"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t('step1.tab_manual')}
              </button>
            </div>

            <div className="p-8">
              {inviteMode === "file" ? (
                <>
                  <ContactImport 
                    onContactsLoaded={handleContactsLoaded}
                    guestsEnabled={details.guestsEnabled}
                    data={importData}
                    setData={setImportData}
                    nameCol={importNameCol}
                    setNameCol={setImportNameCol}
                    phoneCol={importPhoneCol}
                    setPhoneCol={setImportPhoneCol}
                    inviteCountCol={importInviteCountCol}
                    setInviteCountCol={setImportInviteCountCol}
                    startRow={importStartRow}
                    setStartRow={setImportStartRow}
                    fileName={importFileName}
                    setFileName={setImportFileName}
                  />

                  {/* Excel Sheet Mockup */}
                  <div className="mt-8 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex items-center gap-2" dir="ltr">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                      </div>
                      <div className="ml-4 text-[10px] font-medium text-stone-500 bg-white px-3 py-0.5 rounded border border-stone-200 flex items-center gap-1.5">
                        <FileSpreadsheet size={12} className="text-green-600" />
                        guests.xlsx
                      </div>
                    </div>
                    <div className="overflow-x-auto" dir="ltr">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200">
                            <th className="px-4 py-2 w-12 text-center text-xs font-medium text-stone-400 border-r border-stone-200">#</th>
                            <th className={`px-4 py-2 font-medium text-stone-600 border-r border-stone-200 ${details.guestsEnabled ? 'w-1/3' : 'w-1/2'}`}>A</th>
                            <th className={`px-4 py-2 font-medium text-stone-600 ${details.guestsEnabled ? 'border-r border-stone-200 w-1/3' : 'w-1/2'}`}>B</th>
                            {details.guestsEnabled && <th className="px-4 py-2 font-medium text-stone-600 w-1/3">C</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          <tr className="bg-stone-50/50">
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">1</td>
                            <td className="px-4 py-2 font-medium text-stone-900 border-r border-stone-200 bg-blue-50/30 text-right">{t('step1.manual_name')}</td>
                            <td className={`px-4 py-2 font-medium text-stone-900 bg-green-50/30 text-right ${details.guestsEnabled ? 'border-r border-stone-200' : ''}`}>{t('step1.manual_phone')}</td>
                            {details.guestsEnabled && <td className="px-4 py-2 font-medium text-stone-900 bg-orange-50/30 text-right">{t('step1.invite_count')}</td>}
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">2</td>
                            <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'محمد السالم' : 'Mohammed Al-Salem'}</td>
                            <td className={`px-4 py-2 text-stone-600 font-mono text-xs text-right ${details.guestsEnabled ? 'border-r border-stone-200' : ''}`} dir="ltr">+966512992124</td>
                            {details.guestsEnabled && <td className="px-4 py-2 text-stone-600 text-right">2</td>}
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">3</td>
                            <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'عبدالله الدوسري' : 'Abdullah Al-Dosari'}</td>
                            <td className={`px-4 py-2 text-stone-600 font-mono text-xs text-right ${details.guestsEnabled ? 'border-r border-stone-200' : ''}`} dir="ltr">+96599828842</td>
                            {details.guestsEnabled && <td className="px-4 py-2 text-stone-600 text-right">3</td>}
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">4</td>
                            <td className="px-4 py-2 text-stone-400 italic border-r border-stone-200 text-right">...</td>
                            <td className={`px-4 py-2 text-stone-400 italic text-right ${details.guestsEnabled ? 'border-r border-stone-200' : ''}`}>...</td>
                            {details.guestsEnabled && <td className="px-4 py-2 text-stone-400 italic text-right">...</td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in">
                  <div className="space-y-4">
                    {invites.map((invite, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-stone-700 mb-1.5">
                            {t('step1.manual_name')}
                          </label>
                          <input
                            type="text"
                            value={invite.name}
                            onChange={(e) => updateManualInvite(index, "name", e.target.value)}
                            placeholder={t('step1.manual_name')}
                            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-stone-700 mb-1.5">
                            {t('step1.manual_phone')}
                          </label>
                          <input
                            type="tel"
                            value={invite.phone}
                            onChange={(e) => updateManualInvite(index, "phone", e.target.value)}
                            placeholder="+96512345678"
                            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm dir-ltr text-right"
                          />
                        </div>
                        {details.guestsEnabled && (
                          <div className="w-24">
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              {t('step1.invite_count')}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={invite.inviteCount}
                              onChange={(e) => updateManualInvite(index, "inviteCount", parseInt(e.target.value, 10) || 1)}
                              className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm text-center"
                            />
                          </div>
                        )}
                        {invites.length > 1 && (
                          <button
                            onClick={() => removeManualInvite(index)}
                            className="mt-7 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addManualInvite}
                    className="mt-6 w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Plus size={18} />
                    <span>{t('step1.add_guest')}</span>
                  </button>
                </div>
              )}
            </div>
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-between items-center">
              <span className="text-xs text-stone-500">
                {t('step1.added_contacts', {count: invites.filter(i => i.name || i.phone).length})}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all flex items-center gap-2"
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                  <span>{t('step1.back')}</span>
                </button>
                <button
                  onClick={() => {
                    const normalized = validateAndNormalizeInvites();
                    if (normalized.ok) setStep(3);
                  }}
                  className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all flex items-center gap-2"
                >
                  <span>{t('step1.next')}</span>
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & CREATE */}
      {step === 3 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">
              {t('step3.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step3.desc')}
            </p>

            {/* Make it obvious invites are not sent yet */}
            <div className="mt-5 max-w-2xl mx-auto">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-start">
                <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Info size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-stone-900">
                    {t('step3.free_create_title')}
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    {t('step3.free_create_note')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Phone Preview */}
            <InvitePreview
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
              locale={details.messageLocale}
            />

            {/* Summary Box */}
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-lg mt-8 lg:mt-0">
              <h3 className="text-lg font-display font-semibold text-stone-900 mb-6">
                {t('step3.event_summary')}
              </h3>

              <div className="space-y-4 mb-8 border-b border-stone-100 pb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.count_invites')}</span>
                  <span className="font-medium text-stone-900">{invites.filter(i => i.name || i.phone).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.service_qr')}</span>
                  <span className={details.qrEnabled ? "font-medium text-stone-900" : "text-stone-400"}>
                    {details.qrEnabled ? t('step3.enabled') : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.service_reminder')}</span>
                  <span className={details.reminderEnabled ? "font-medium text-stone-900" : "text-stone-400"}>
                    {details.reminderEnabled ? t('step3.enabled') : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.service_scheduled')}</span>
                  <span className={details.isScheduled ? "font-medium text-stone-900" : "text-stone-400"}>
                    {details.isScheduled ? (
                      <span className="text-[11px]">
                        {details.scheduledDate} {details.scheduledTime}
                      </span>
                    ) : "-"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCreateEvent}
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium text-sm hover:bg-stone-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? t('step3.creating') : t('step3.create_event')}</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 rtl:rotate-180"
                  />
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-3 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors"
                >
                  {t('step1.back')}
                </button>
              </div>

              <p className="text-[10px] text-stone-500 text-center mt-4">
                {t('step3.pay_later_note')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
