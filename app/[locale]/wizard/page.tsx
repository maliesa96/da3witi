"use client";

import { useState } from "react";
import {
  ArrowRight,
  UploadCloud,
  ArrowLeft,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

import InvitePreview from "../../components/InvitePreview";
import ContactImport from "../../components/ContactImport";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { createEventAndSendInvites } from "./actions";
import { useRouter } from "@/navigation";
import { uploadEventMedia, validateFileType, type MediaType } from "@/lib/supabase/storage";
import { formatGoogleMapsLink } from "@/lib/maps";

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
  const locale = useLocale() as 'en' | 'ar';
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mapMode, setMapMode] = useState<"link" | "map">("link");
  const [details, setDetails] = useState({
    date: "",
    time: "",
    location: "",
    locationName: "",
    message: "",
    qrEnabled: true,
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
  const [invites, setInvites] = useState([{ name: "", phone: "" }]);

  // State for ContactImport to persist across tab switches
  const [importData, setImportData] = useState<(string | number | null)[][]>([]);
  const [importNameCol, setImportNameCol] = useState<number | null>(null);
  const [importPhoneCol, setImportPhoneCol] = useState<number | null>(null);
  const [importStartRow, setImportStartRow] = useState(0);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const addManualInvite = () => {
    setInvites([...invites, { name: "", phone: "" }]);
  };

  const updateManualInvite = (index: number, field: "name" | "phone", value: string) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const removeManualInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const handleContactsLoaded = (loadedContacts: { name: string; phone: string }[]) => {
    setInvites(loadedContacts);
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
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayAndSend = async () => {
    setIsSubmitting(true);
    try {
      const result = await createEventAndSendInvites({
        title: "Event", // Default or extract from message
        date: details.date,
        time: details.time,
        location: details.location,
        locationName: details.locationName,
        message: details.message,
        qrEnabled: details.qrEnabled,
        reminderEnabled: details.reminderEnabled,
        isScheduled: details.isScheduled,
        scheduledAt: details.isScheduled ? `${details.scheduledDate}T${details.scheduledTime}` : undefined,
        imageUrl: details.imageUrl,
        mediaType: details.mediaType,
        mediaFilename: details.mediaFilename,
        guests: invites.filter(i => i.name && i.phone),
        locale
      });

      if (result.success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to send invitations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24">
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-12 relative max-w-2xl mx-auto">
        <div className="absolute top-1/2 left-0 w-full h-px bg-stone-200 -z-10"></div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-stone-50 px-2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => setStep(i)}
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
                : t('steps.preview')}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: OPTIONS */}
      {step === 1 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
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
              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="text-sm font-medium text-stone-900">
                  {t('step2.image_upload')}
                </h3>
                
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
                  } ${uploadError ? 'border-red-300' : ''}`}>
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
                      if (errors.message) setErrors(prev => {
                        const next = { ...prev };
                        delete next.message;
                        return next;
                      });
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg bg-stone-50 border text-sm focus:bg-white focus:border-stone-400 outline-none transition-all resize-none ${
                      errors.message ? 'border-red-300' : 'border-stone-200'
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                      <span>{t('step2.date_label')} <span className="text-red-500">*</span></span>
                      {errors.date && <span className="text-red-500 text-[10px]">{errors.date}</span>}
                    </label>
                    <input
                      type="date"
                      value={details.date}
                      onChange={(e) => {
                        setDetails({ ...details, date: e.target.value });
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
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-1.5 flex justify-between">
                      <span>{t('step2.time_label')} <span className="text-red-500">*</span></span>
                      {errors.time && <span className="text-red-500 text-[10px]">{errors.time}</span>}
                    </label>
                    <input
                      type="time"
                      value={details.time}
                      onChange={(e) => {
                        setDetails({ ...details, time: e.target.value });
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

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    if (validateStep2()) {
                      setStep(2);
                    }
                  }}
                  className="bg-stone-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2"
                >
                  <span>{t('step1.next')}</span>
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
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
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step1.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step1.desc')}
            </p>
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
                  {/* Excel Sheet Mockup */}
                  <div className="mb-8 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
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
                            <th className="px-4 py-2 font-medium text-stone-600 border-r border-stone-200 w-1/2">A</th>
                            <th className="px-4 py-2 font-medium text-stone-600 w-1/2">B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          <tr className="bg-stone-50/50">
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">1</td>
                            <td className="px-4 py-2 font-medium text-stone-900 border-r border-stone-200 bg-blue-50/30 text-right">{t('step1.manual_name')}</td>
                            <td className="px-4 py-2 font-medium text-stone-900 bg-green-50/30 text-right">{t('step1.manual_phone')}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">2</td>
                            <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'محمد السالم' : 'Mohammed Al-Salem'}</td>
                            <td className="px-4 py-2 text-stone-600 font-mono text-xs text-right" dir="ltr">+966512992124</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">3</td>
                            <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'عبدالله الدوسري' : 'Abdullah Al-Dosari'}</td>
                            <td className="px-4 py-2 text-stone-600 font-mono text-xs text-right" dir="ltr">+96599828842</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">4</td>
                            <td className="px-4 py-2 text-stone-400 italic border-r border-stone-200 text-right">...</td>
                            <td className="px-4 py-2 text-stone-400 italic text-right">...</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <ContactImport 
                    onContactsLoaded={handleContactsLoaded}
                    data={importData}
                    setData={setImportData}
                    nameCol={importNameCol}
                    setNameCol={setImportNameCol}
                    phoneCol={importPhoneCol}
                    setPhoneCol={setImportPhoneCol}
                    startRow={importStartRow}
                    setStartRow={setImportStartRow}
                    fileName={importFileName}
                    setFileName={setImportFileName}
                  />
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
                            placeholder="05xxxxxxxx"
                            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm dir-ltr text-right"
                          />
                        </div>
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
                  onClick={() => setStep(3)}
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

      {/* STEP 3: PREVIEW & PAY */}
      {step === 3 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step3.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step3.desc')}
            </p>
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
            />

            {/* Checkout Box */}
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-lg mt-8 lg:mt-0">
              <h3 className="text-lg font-semibold text-stone-900 mb-6">
                {t('step3.order_summary')}
              </h3>

              <div className="space-y-4 mb-8 border-b border-stone-100 pb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.count_invites')}</span>
                  <span className="font-medium text-stone-900">{invites.filter(i => i.name || i.phone).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.service_qr')}</span>
                  <span className={details.qrEnabled ? "font-medium text-stone-900" : "text-stone-400"}>
                    {details.qrEnabled ? t('step3.active') : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step3.service_reminder')}</span>
                  <span className={details.reminderEnabled ? "font-medium text-stone-900" : "text-stone-400"}>
                    {details.reminderEnabled ? t('step3.active') : "-"}
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
                <div className="flex justify-between items-center text-lg font-semibold pt-2">
                  <span className="text-stone-900">{t('step3.total')}</span>
                  <span className="text-stone-900">84.00 ر.س</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePayAndSend}
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium text-sm hover:bg-stone-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? 'Sending...' : t('step3.pay_send')}</span>
                  <CreditCard
                    size={16}
                    className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1"
                  />
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-3 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors"
                >
                  {t('step1.back')}
                </button>
              </div>

              <p className="text-[10px] text-stone-400 text-center mt-4">
                {t('step3.terms')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
