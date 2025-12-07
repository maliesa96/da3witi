"use client";

import { QrCode, Check, X, MapPin, ChevronLeft, ChevronRight, Phone, Video, Plus, Mic, Camera, Signal, Wifi, Battery, MailOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface InvitePreviewProps {
  title?: string;
  date: string;
  location: string;
  message: string;
  imageUrl?: string;
  showQr?: boolean;
}

export default function InvitePreview({
  date,
  location,
  message,
  imageUrl,
  showQr = true,
}: InvitePreviewProps) {
  const t = useTranslations('InvitePreview');
  const locale = useLocale();
  
  // Get current time for the timestamp
  const now = new Date();
  const timeString = now.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="flex justify-center h-full items-start pt-4">
      <div className="w-[400px] h-[800px] bg-black rounded-[3.5rem] border-8 border-[#1c1c1e] shadow-2xl overflow-hidden relative ring-1 ring-white/10">
        
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
              
              {/* Image Header */}
              <div className="bg-[#2a3942] rounded-lg overflow-hidden relative">
                <img
                  src={
                    imageUrl ||
                    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600"
                  }
                  className="w-full h-auto object-contain opacity-90"
                  alt="Invite"
                />
              </div>
              
              {/* Body */}
              <div className="px-3 pt-1 pb-5 text-start" dir="auto">
                <p className="text-[14px] text-[#e9edef] leading-relaxed whitespace-pre-wrap font-sans">
                  <span className="font-bold block mb-1 text-white">{t('greeting', {name: locale === 'ar' ? 'عبدالله' : 'Abdullah'})}</span>
                  {message}
                  <br />
                  <br />
                  📅 <strong>{t('date_label')}</strong> {date || (locale === 'ar' ? "الجمعة، 20 أكتوبر" : "Friday, Oct 20")}
                  <br />
                  📍 <strong>{t('location_label')}</strong> {location || (locale === 'ar' ? "قاعة الريتز كارلتون" : "Ritz Carlton Hall")}
                </p>

                {/* QR Code */}
                {showQr && (
                  <div className="mt-4 flex flex-col items-center border-t border-dashed border-white/10 pt-3">
                    <div className="border-2 border-dashed border-[#8696a0] rounded p-2 bg-white/5">
                      <QrCode size={64} className="text-white" />
                    </div>
                    <p className="text-[10px] text-[#8696a0] mt-1">{t('scan_code')}</p>
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-[#8696a0]">{timeString}</span>
              </div>
            </div>
            
            {/* Interactive Buttons (Vertical Stack) - Dark Mode */}
            <div className="max-w-[85%]">
                <button className="w-full bg-[#1f2c34] rounded-t-none rounded-b-none py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2 border-b border-[#101a20]">
                    <Check size={16} />
                    <span>{t('confirm_btn')}</span>
                </button>
                <button className="w-full bg-[#1f2c34] rounded-none py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2 border-b border-[#101a20]">
                    <X size={16} />
                    <span>{t('apologize_btn')}</span>
                </button>
                <button className="w-full bg-[#1f2c34] rounded-t-none rounded-b-xl py-2.5 px-4 text-[#53bdeb] text-sm font-medium shadow-sm active:bg-[#2a3942] transition-colors flex items-center justify-center gap-2">
                    <MapPin size={16} />
                    <span>{t('map_btn')}</span>
                </button>
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
