"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Send, BarChart3, QrCode, Smartphone, FileSpreadsheet, CheckCircle2, Check, Users, PenTool, Image as ImageIcon, MapPin, Calendar, Clock } from "lucide-react";
import { useLocale } from "next-intl";

export default function StorySlider() {
  const [activeStep, setActiveStep] = useState(0);
  const locale = useLocale();
  const isAr = locale === 'ar';

  const steps = [
    {
      id: "create",
      icon: PenTool,
      title: isAr ? "صمم دعوتك" : "Create Invite",
      desc: isAr ? "حدد تفاصيل الحدث، النص، والصورة في ثوانٍ" : "Set event details, message, and image in seconds.",
      color: "bg-purple-100 text-purple-600",
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/5 rounded-full blur-3xl scale-150" />
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 w-64 bg-white rounded-2xl shadow-2xl border border-purple-50 overflow-hidden flex flex-col"
            >
                {/* Image Area */}
                <div className="h-32 bg-stone-100 relative overflow-hidden">
                    <motion.img 
                        src="/images/sample_invite.jpeg"
                        alt="Event"
                        className="w-full h-full object-cover"
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-60" />
                    
                     {/* Upload Button Effect */}
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, y: [10, 0] }}
                        transition={{ delay: 0.2 }}
                        className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-md p-1.5 rounded-lg border border-white/30"
                    >
                         <ImageIcon size={14} className="text-white" />
                    </motion.div>
                </div>

                {/* Content Fields */}
                <div className="p-4 space-y-3 relative">
                    {/* Title */}
                    <motion.div 
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                         <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-0.5">{isAr ? "حفل زفاف" : "WEDDING"}</div>
                         <div className="font-serif text-lg text-stone-900 leading-tight">{isAr ? "محمد & سارة" : "Mohammad & Sarah"}</div>
                    </motion.div>
                    
                    {/* Date/Time Row */}
                    <div className="flex gap-2 text-[10px] text-stone-600 font-medium">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex items-center gap-1 bg-stone-50 px-2 py-1.5 rounded-md border border-stone-100"
                        >
                            <Calendar size={10} className="text-purple-500" />
                            <span>{isAr ? "١٥ أكتوبر" : "Oct 15, 2024"}</span>
                        </motion.div>
                        <motion.div 
                             initial={{ scale: 0.9, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ delay: 0.7 }}
                             className="flex items-center gap-1 bg-stone-50 px-2 py-1.5 rounded-md border border-stone-100"
                        >
                            <Clock size={10} className="text-purple-500" />
                             <span>{isAr ? "٨:٠٠ م" : "8:00 PM"}</span>
                        </motion.div>
                    </div>

                    {/* Location Row */}
                    <motion.div 
                         initial={{ x: -10, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         transition={{ delay: 0.8 }}
                         className="flex items-center gap-1.5 text-stone-500 text-[10px]"
                    >
                        <MapPin size={12} className="text-stone-400 shrink-0" />
                        <span className="truncate">{isAr ? "فندق الريتز كارلتون، الرياض" : "The Ritz-Carlton, Riyadh"}</span>
                    </motion.div>
                    
                    {/* Message Body */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0, duration: 0.5 }}
                        className="text-[10px] text-stone-400 leading-relaxed pt-1 border-t border-stone-50 mt-2"
                    >
                        {isAr 
                            ? "نتشرف بدعوتكم لحضور حفل زفافنا وتناول طعام العشاء..." 
                            : "We are honored to invite you to celebrate our wedding..."}
                    </motion.div>

                    {/* Cursor Simulation */}
                    <motion.div
                        initial={{ x: 100, y: 100, opacity: 0 }}
                        animate={{ 
                            x: [50, 0, 20, 100], 
                            y: [50, 0, 80, 150],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{ duration: 2, times: [0, 0.3, 0.8, 1], delay: 0.3 }}
                        className="absolute top-0 left-0 pointer-events-none z-20"
                    >
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19169L17.4741 17.4196L9.47405 17.4196L9.67954 17.4196H9.47405L5.65376 12.3673Z" fill="black" stroke="white" strokeWidth="2"/>
                        </svg>
                    </motion.div>
                </div>

                 {/* Success Badge */}
                 <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5, type: "spring" }}
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-green-600 p-1.5 rounded-full shadow-lg z-20"
                 >
                    <Check size={14} strokeWidth={3} />
                 </motion.div>
            </motion.div>
        </div>
      )
    },
    {
      id: "import",
      icon: FileSpreadsheet,
      title: isAr ? "استيراد الضيوف" : "Import Guests",
      desc: isAr ? "ارفع ملف إكسل أو جهات الاتصال بضغطة زر" : "Upload your guest list from Excel or contacts instantly.",
      color: "bg-blue-100 text-blue-600",
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Abstract Background */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl scale-150" />
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 w-72"
            >
                {/* Main Card - Guest List */}
                <motion.div 
                    className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <div className="bg-blue-600 p-4 flex justify-between items-center">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                        </div>
                        <div className="text-white text-xs font-bold uppercase tracking-wider opacity-80">Guest List.csv</div>
                    </div>
                    <div className="p-3 space-y-2">
                         {/* Animated Rows */}
                         {[1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.15 + 0.2 }}
                                className="flex items-center gap-3 p-2 rounded-lg bg-stone-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {String.fromCharCode(64 + i)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="w-24 h-2 bg-stone-200 rounded mb-1.5" />
                                    <div className="w-16 h-1.5 bg-stone-100 rounded" />
                                </div>
                                <div className="text-green-500 shrink-0">
                                     <CheckCircle2 size={14} />
                                </div>
                            </motion.div>
                         ))}
                    </div>
                    
                     {/* Upload Success Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.3 }}
                        className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center"
                    >
                         <div className="text-center">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.3, type: "spring" }}
                                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg mx-auto mb-3"
                            >
                                <CheckCircle2 size={32} strokeWidth={3} />
                            </motion.div>
                            <div className="text-stone-900 font-bold text-lg">{isAr ? "تم الاستيراد" : "Imported!"}</div>
                            <div className="text-stone-500 text-sm">{isAr ? "١٥٠ ضيف" : "150 Guests added"}</div>
                         </div>
                    </motion.div>
                </motion.div>
                
                {/* Floating CSV Icon */}
                <motion.div
                    initial={{ x: 50, y: -20, rotate: 10, opacity: 0 }}
                    animate={{ x: 30, y: -10, rotate: 5, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -right-4 -top-6 bg-blue-500 text-white p-3 rounded-2xl shadow-xl shadow-blue-500/20 z-20"
                >
                    <FileSpreadsheet size={24} />
                </motion.div>
            </motion.div>
        </div>
      )
    },
    {
      id: "send",
      icon: Send,
      title: isAr ? "إرسال الدعوات" : "Send Invites",
      desc: isAr ? "عبر واتساب أو رسائل نصية مع رابط خاص" : "Send personalized invites via WhatsApp or SMS in one click.",
      color: "bg-green-100 text-green-600",
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
             <div className="absolute inset-0 bg-green-500/5 rounded-full blur-3xl scale-150" />
        
             <motion.div 
                className="relative z-10 w-64 bg-white rounded-3xl shadow-2xl border border-green-50 p-4 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
             >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-stone-100 pb-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Send size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-stone-800">{isAr ? "الرسائل" : "Messages"}</div>
                        <div className="text-[10px] text-stone-400">{isAr ? "جاري الإرسال..." : "Sending..."}</div>
                    </div>
                </div>

                {/* Chat Stream */}
                <div className="space-y-3">
                    {/* Invite 1 */}
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex justify-end"
                    >
                        <div className="bg-green-500 text-white text-[10px] py-2 px-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%]">
                            {isAr ? "مرحباً أحمد، ندعوك لحضور حفلنا 💌" : "Hi Ahmed, you're invited! 💌"}
                        </div>
                    </motion.div>

                    {/* Reply 1 */}
                    <motion.div 
                        initial={{ x: -20, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2, type: "spring" }}
                        className="flex justify-start items-end gap-2"
                    >
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-600">A</div>
                        <div className="bg-stone-100 text-stone-600 text-[10px] py-2 px-3 rounded-2xl rounded-tl-sm shadow-sm">
                            {isAr ? "أكيد، بكون موجود! ✅" : "Count me in! ✅"}
                        </div>
                    </motion.div>

                    {/* Invite 2 */}
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 2.0 }}
                        className="flex justify-end"
                    >
                        <div className="bg-green-500 text-white text-[10px] py-2 px-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%]">
                           {isAr ? "مرحباً سارة، ندعوكِ لحضور..." : "Hi Sara, join us at..."}
                        </div>
                    </motion.div>

                     {/* Reply 2 */}
                    <motion.div 
                        initial={{ x: -20, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 3.0, type: "spring" }}
                        className="flex justify-start items-end gap-2"
                    >
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-600">S</div>
                        <div className="bg-stone-100 text-stone-600 text-[10px] py-2 px-3 rounded-2xl rounded-tl-sm shadow-sm">
                            {isAr ? "آسفة، ما أقدر 🙏" : "Sorry, can't make it 🙏"}
                        </div>
                    </motion.div>
                </div>
             </motion.div>
          </div>
      )
    },
    {
      id: "track",
      icon: BarChart3,
      title: isAr ? "تتبع الردود" : "Track RSVPs",
      desc: isAr ? "تابع من أكد حضوره ومن اعتذر لحظة بلحظة" : "Watch real-time updates as guests confirm or decline.",
      color: "bg-amber-100 text-amber-600",
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/5 rounded-full blur-3xl scale-150" />
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex items-center gap-6"
            >
                {/* Donut Chart */}
                <div className="relative w-40 h-40">
                     <svg className="w-full h-full -rotate-90">
                         {/* Background Circle */}
                         <circle cx="80" cy="80" r="70" fill="none" stroke="#FEF3C7" strokeWidth="20" />
                         {/* Yes Segment */}
                         <motion.circle 
                            cx="80" cy="80" r="70" 
                            fill="none" 
                            stroke="#16A34A" 
                            strokeWidth="20"
                            strokeLinecap="round"
                            strokeDasharray="440"
                            strokeDashoffset="440"
                            animate={{ strokeDashoffset: 110 }} // ~75%
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                         />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-3xl font-black text-stone-900"
                         >
                            85%
                         </motion.div>
                         <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{isAr ? "حضور" : "YES"}</div>
                     </div>
                </div>
                
                {/* Stats Cards */}
                <div className="space-y-3">
                    <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white p-3 rounded-2xl shadow-lg border border-stone-100 flex items-center gap-3 w-36"
                    >
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-stone-900 leading-none">85</div>
                            <div className="text-[9px] text-stone-500 uppercase font-bold mt-0.5">{isAr ? "مؤكد" : "Confirmed"}</div>
                        </div>
                    </motion.div>
        
                     <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white p-3 rounded-2xl shadow-lg border border-stone-100 flex items-center gap-3 w-36"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <Users size={16} />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-stone-900 leading-none">12</div>
                            <div className="text-[9px] text-stone-500 uppercase font-bold mt-0.5">{isAr ? "معتذر" : "Declined"}</div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
      )
    },
    {
      id: "checkin",
      icon: QrCode,
      title: isAr ? "مسح QR Code" : "QR Check-in",
      desc: isAr ? "استقبال الضيوف بسرعة وسلاسة عند الباب" : "Scan QR codes at the door for smooth entry.",
      color: "bg-purple-100 text-purple-600",
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/5 rounded-full blur-3xl scale-150" />
        
            {/* Realistic Phone Frame */}
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="w-48 h-[360px] bg-stone-900 rounded-3xl p-2 shadow-2xl relative"
            >
                {/* Screen */}
                <div className="w-full h-full bg-stone-800 rounded-2xl overflow-hidden relative">
                     {/* Camera Feed Simulation */}
                     <div className="absolute inset-0 bg-stone-700">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                     </div>
        
                     {/* QR Code Overlay */}
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-32 h-32 border-2 border-white/50 rounded-xl relative">
                             <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 rounded-tl-xl" />
                             <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 rounded-tr-xl" />
                             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 rounded-bl-xl" />
                             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 rounded-br-xl" />
                             
                             <QrCode className="text-white/80 w-full h-full p-2 opacity-50" />
                             
                             {/* Laser Scan */}
                             <motion.div 
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)] z-10"
                             />
                         </div>
                     </div>
                     
                     {/* Success Popover */}
                     <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1, type: "spring" }}
                        className="absolute bottom-6 left-2 right-2 bg-white rounded-xl p-2 shadow-xl flex items-center gap-2 overflow-hidden"
                     >
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <CheckCircle2 size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-stone-900 text-[11px] whitespace-nowrap leading-tight">{isAr ? "دخول مصرح" : "Access Granted"}</div>
                            <div className="text-[9px] text-stone-500 whitespace-nowrap leading-tight">Mohammad Al-Otaibi</div>
                        </div>
                     </motion.div>
                </div>
            </motion.div>
          </div>
      )
    }
  ];

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-full" dir={isAr ? "rtl" : "ltr"}>
      <div className="bg-white rounded-[3rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden flex flex-col md:flex-row h-auto md:h-[500px]">
        
        {/* Left: Steps List */}
        <div className="md:w-5/12 p-8 md:p-12 flex flex-col justify-center gap-6 relative z-10 bg-white">
          {steps.map((step, idx) => {
             const isActive = activeStep === idx;
             return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-start gap-4 text-start transition-all duration-300 relative ${isActive ? "opacity-100 scale-100" : "opacity-40 hover:opacity-70 scale-95"}`}
                >
                   {/* Progress Line */}
                   {idx !== steps.length - 1 && (
                      <div className="absolute left-[1.65rem] top-12 bottom-0 w-0.5 bg-stone-100 -z-10 md:h-12" />
                   )}
                   
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300 ${isActive ? step.color : "bg-stone-100 text-stone-400"}`}>
                      <step.icon size={24} />
                   </div>
                   
                   <div className="pt-1">
                      <h3 className={`text-xl font-bold leading-tight mb-1 transition-colors ${isActive ? "text-stone-900" : "text-stone-500"}`}>
                         {step.title}
                      </h3>
                      <p className={`text-sm leading-relaxed transition-colors ${isActive ? "text-stone-600" : "text-stone-400"}`}>
                         {step.desc}
                      </p>
                      
                      {/* Active Progress Bar */}
                      {isActive && (
                        <motion.div 
                          className="h-1 bg-stone-900 mt-4 rounded-full origin-left"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 4, ease: "linear" }}
                        />
                      )}
                   </div>
                </button>
             );
          })}
        </div>

        {/* Right: Visual Display */}
        <div className="md:w-7/12 bg-stone-50 relative overflow-hidden flex items-center justify-center p-8 min-h-[300px] md:min-h-full">
           <AnimatePresence mode="wait">
              {steps[activeStep].visual}
           </AnimatePresence>
           
           {/* Background Decorations */}
           <div className="absolute inset-0 opacity-30 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-stone-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-200 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
           </div>
        </div>

      </div>
    </div>
  );
}
