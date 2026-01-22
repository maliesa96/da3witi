"use client";

import { ChevronLeft, ChevronRight, Phone, Video, Plus, Mic, Camera, Signal, Wifi, Battery, MailOpen, Reply, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations, NextIntlClientProvider } from "next-intl";
import { TEMPLATES } from "@/lib/templates/templates";
import { getInviteTemplateName } from "@/lib/whatsapp";
import React, { useEffect, useState } from "react";

interface InvitePreviewProps {
  title?: string;
  date: string;
  time?: string;
  locationName: string;
  location?: string;
  message: string;
  imageUrl?: string;
  mediaType?: 'image' | 'document';
  mediaFilename?: string;
  mediaSize?: number;
  showQr?: boolean;
  locale?: 'en' | 'ar'; // Optional: override locale for user-specific preferences
}

function InvitePreviewContent({
  date,
  time,
  locationName,
  location,
  message,
  imageUrl,
  mediaType = 'image',
  mediaFilename,
  mediaSize,
  showQr = true,
  locale: customLocale,
}: InvitePreviewProps) {
  const t = useTranslations('InvitePreview');
  const siteLocale = useLocale();
  const locale = customLocale || siteLocale;
  
  // Get current time for the timestamp
  const now = new Date();
  const timeString = now.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const templateName = getInviteTemplateName(locale, showQr, mediaType) as keyof typeof TEMPLATES;
  const templateFn = TEMPLATES[templateName];
  
  const renderedMessage = templateFn ? templateFn({
    invitee: t('default_invitee'),
    greeting_text: message || t('default_message_preview'),
    date: date || t('default_date'),
    time: time || timeString, // Use the selected time if available, otherwise current time
    location_name: locationName || t('default_location_name'),
    event_name: t('app_name'),
    rsvp_date: date || t('default_rsvp_date'),
  }) : message;

  const thankYouMsg = t('thank_you_message');
    
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=sample-qr`;
  const qrCaption = t('qr_caption');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex justify-center h-full items-start pt-4 w-full">
      <div className="w-full max-w-[400px] aspect-1/2 bg-black rounded-[2.5rem] sm:rounded-[3.5rem] border-[6px] sm:border-8 border-[#1c1c1e] shadow-2xl overflow-hidden relative ring-1 ring-white/10 mx-auto">
        
        {/* Screen Content - Dark Mode Background */}
        <div className="w-full h-full bg-[#0b141a] whatsapp-bg-dark flex flex-col relative font-sans">
          
          {/* Status Bar - Padded to avoid notch */}
          <div className="absolute top-0 w-full h-12 flex items-end justify-between px-6 pb-2 z-50 text-white bg-[#161f25]/90 backdrop-blur-md">
             <span className="text-[14px] font-semibold ml-2">9:41</span>
             <div className="flex gap-1.5 items-center mr-1">
               <Signal size={14} className="fill-white" />
               <Wifi size={14} />
               <Battery size={18} className="fill-white text-white/40" />
             </div>
          </div>

          {/* iOS WhatsApp Header - Dark Mode */}
          <div className="h-14 bg-[#161f25]/90 backdrop-blur-md border-b border-white/10 flex items-center px-3 z-30 relative mt-12">
             <div className="flex items-center gap-1 text-[#007AFF]">
                <ChevronRight size={26} strokeWidth={2.5} className="-mr-1 hidden rtl:block" />
                <ChevronLeft size={26} strokeWidth={2.5} className="-ml-1 block rtl:hidden" />
             </div>
             
             <div className="flex-1 flex items-center gap-2 ml-2 mr-2 cursor-pointer">
                 <div className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-700 shrink-0 overflow-hidden border border-white/10">
                    <MailOpen size={20} className="text-white" /> 
                 </div>
                 <div className="flex flex-col justify-center leading-tight">
                     <span className="text-[15px] font-semibold text-white">{t('app_name')}</span>
                     <span className="text-[10px] text-gray-400">{t('contact_info')}</span>
                 </div>
             </div>
             
             <div className="flex gap-4 text-[#007AFF] mr-1">
                 <Video size={22} strokeWidth={1.5} />
                 <Phone size={20} strokeWidth={1.5} />
             </div>
          </div>

          {/* Chat Area - Dark Mode */}
          <div className="flex-1 p-3 overflow-y-auto bg-[#0b141a]">
            <div className="flex justify-center my-3">
               <span className="bg-[#1c272e] text-[#8696a0] text-[10px] px-2 py-0.5 rounded-md shadow-sm font-medium border border-white/5">{t('today')}</span>
            </div>
            
            {/* Message Bubble (Incoming) - Dark Mode */}
            <div className="bg-[#1f2c34] rounded-tl-none rounded-bl-none p-1 pb-0 shadow-sm max-w-[85%] self-start relative group border-b border-[#101a20]">
              
              {/* Media Header */}
              {mediaType === 'document' ? (
                <div className="rounded-lg overflow-hidden mb-1">
                  <div className="flex items-center gap-2 bg-[#161f25] p-1.5 rounded-md">
                    <svg width="20" height="24" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                      <path d="M4 0C1.79086 0 0 1.79086 0 4V44C0 46.2091 1.79086 48 4 48H36C38.2091 48 40 46.2091 40 44V12L28 0H4Z" fill="#E53935"/>
                      <path d="M28 0V12H40L28 0Z" fill="white" fillOpacity="0.3"/>
                      <text x="20" y="35" textAnchor="middle" fill="white" style={{ fontSize: '11px', fontWeight: '900', fontFamily: 'system-ui, -apple-system, sans-serif' }}>PDF</text>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#e9edef] truncate mb-1">
                        {mediaFilename || 'Invitation.pdf'}
                      </p>
                      <p className="text-[8px] text-[#8696a0] leading-tight mb-0.5">
                        {mediaSize ? formatFileSize(mediaSize) : '1.2 MB'} • PDF
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#2a3942] rounded-lg overflow-hidden relative aspect-4/3 mb-1">
                  <Image
                    src={
                      imageUrl ||
                      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600"
                    }
                    fill
                    className="object-cover opacity-90"
                    alt="Invite"
                    unoptimized
                  />
                </div>
              )}
              
              {/* Body */}
              <div className="px-3 pt-1 pb-5 text-start" dir="auto">
                <p className="text-[14px] text-[#e9edef] leading-relaxed whitespace-pre-wrap font-sans">
                  {renderedMessage}
                </p>
              </div>
              
              {/* Timestamp */}
              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-[#8696a0]">{timeString}</span>
              </div>
            </div>
            
            {/* Interactive Buttons (Vertical Stack) - Dark Mode */}
            <div className="max-w-[85%] mb-4">
                <button className="w-full bg-[#1f2c34] rounded-t-none rounded-b-none py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2 border-b border-[#101a20]">
                    <Reply size={16} className="rtl:order-last" />
                    <span>{t('confirm_btn')}</span>
                </button>
                <button className="w-full bg-[#1f2c34] rounded-none py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2 border-b border-[#101a20]">
                    <Reply size={16} className="rtl:order-last" />
                    <span>{t('apologize_btn')}</span>
                </button>
                <a 
                  href={location ? (location.startsWith('http') ? location : `https://www.google.com/maps?q=${location}`) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#1f2c34] rounded-t-none rounded-b-xl py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2"
                >
                    <ExternalLink size={16} className="rtl:order-last" />
                    <span>{t('map_btn')}</span>
                </a>
            </div>

            {/* User Response Bubble (Outgoing) */}
            <div className="flex flex-col items-end mb-4">
              <div className="bg-[#005c4b] rounded-[8px] rounded-tr-none rtl:rounded-tl-none rtl:rounded-tr-[8px] p-[6px_7px_8px_9px] shadow-sm max-w-[85%] relative flex items-end gap-2 transition-all mr-2 rtl:mr-0 rtl:ml-2">
                  <p className="text-[14.2px] text-[#e9edef] leading-[1.3] font-sans">
                    {t('confirm_btn')}
                  </p>
                  <div className="flex items-center gap-[4px] shrink-0 mb-[-2px]">
                    <span className="text-[11px] text-white/50 font-sans tracking-tight">{timeString}</span>
                    <span className="text-[#53bdeb]">
                      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                      </svg>
                    </span>
                  </div>
                  
                {/* Outgoing Tail - Using logical positioning for RTL support */}
                <div className="absolute -top-px right-[-5px] text-[#005c4b] rtl:hidden">
                    <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid slice" fill="currentColor">
                        <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                    </svg>
                </div>
                <div className="absolute -top-px left-[-8px] text-[#005c4b] hidden rtl:block scale-x-[-1] translate-x-px">
                    <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid slice" fill="currentColor">
                        <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                    </svg>
                </div>
              </div>
            </div>

            {/* Business Thank You Bubble (Incoming) */}
            <div className="bg-[#1f2c34] rounded-tl-none rounded-bl-none p-1 pb-0 shadow-sm max-w-[85%] self-start relative mb-4">
              {showQr && (
                <div className="bg-[#2a3942] rounded-lg overflow-hidden relative aspect-square mb-1">
                  <Image
                    src={qrUrl}
                    fill
                    className="object-cover p-4 bg-white"
                    alt="QR Code"
                    unoptimized
                  />
                </div>
              )}
              <div className="px-3 pt-1 pb-5 text-start" dir="auto">
                <p className="text-[14px] text-[#e9edef] leading-relaxed font-sans">
                  {thankYouMsg}
                  {showQr && <span className="block mt-2 font-semibold">{qrCaption}</span>}
                </p>
              </div>
              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-[#8696a0]">{timeString}</span>
              </div>
            </div>

          </div>
          
          {/* iOS Footer Input Area - Dark Mode */}
          <div className="h-[80px] bg-[#161f25]/90 backdrop-blur-md border-t border-white/10 px-2 flex items-start pt-3 gap-3 shrink-0 pb-8 z-30">
             <div className="text-[#007AFF] mt-1 ml-1">
                <Plus size={24} />
             </div>
             <div className="flex-1 bg-[#2a3942] h-9 rounded-full border border-transparent flex items-center px-3 text-sm text-[#8696a0] justify-end">
                <span className="mr-2 opacity-50">{t('sticker')}</span>
             </div>
             <div className="flex gap-4 text-[#007AFF] mt-1 mr-1">
                <Camera size={22} />
                <Mic size={22} />
             </div>
          </div>
          
          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full z-50 opacity-40"></div>
        </div>
      </div>
    </div>
  );
}

type Messages = Record<string, Record<string, string | Record<string, string>>>;

export default function InvitePreview(props: InvitePreviewProps) {
  const [customMessages, setCustomMessages] = useState<Messages | null>(null);
  
  useEffect(() => {
    // Only load custom messages if a custom locale is provided
    if (props.locale) {
      import(`@/messages/${props.locale}.json`).then(m => {
        setCustomMessages(m.default);
      });
    }
  }, [props.locale]);

  // If a custom locale is provided, wrap with NextIntlClientProvider
  if (props.locale) {
    if (!customMessages) {
      return null; // or a loading state
    }

    return (
      <NextIntlClientProvider locale={props.locale} messages={customMessages}>
        <InvitePreviewContent {...props} />
      </NextIntlClientProvider>
    );
  }

  // Default: use site locale from context
  return <InvitePreviewContent {...props} />;
}
