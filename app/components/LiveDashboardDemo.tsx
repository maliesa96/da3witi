"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Bell, Plus, Check, CheckCheck } from "lucide-react";
import { useLocale } from "next-intl";

type ActivityType =
  | "rsvp_yes"
  | "rsvp_no"
  | "new_guest"
  | "msg_sent"
  | "msg_delivered"
  | "msg_read";

type Activity = {
  id: number;
  type: ActivityType;
  user: string;
  time: string;
};

function generateRandomActivity(isArabic: boolean): Activity {
  const types: ActivityType[] = [
    "rsvp_yes",
    "rsvp_no",
    "new_guest",
    "msg_sent",
    "msg_delivered",
    "msg_read",
  ];
  // Weighted random to make RSVPs less frequent than status updates
  const type = types[Math.floor(Math.random() * types.length)];

  const namesEn = ["Khalid M.", "Noura A.", "James B.", "Layla H.", "Omar S.", "Dana W.", "Tariq A."];
  const namesAr = ["خالد م.", "نورة ع.", "جيمس ب.", "ليلى هـ.", "عمر س.", "دانة و.", "طارق ع."];

  const names = isArabic ? namesAr : namesEn;
  const name = names[Math.floor(Math.random() * names.length)];

  return {
    id: Date.now(),
    type,
    user: name,
    time: isArabic ? "الآن" : "Just now",
  };
}

export default function LiveDashboardDemo() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const [stats, setStats] = useState({
    total: 120,
    confirmed: 85,
    declined: 5,
    pending: 30,
  });

  const [activities, setActivities] = useState<Activity[]>([
    { id: 1, type: "rsvp_yes", user: isAr ? "أحمد السالم" : "Ahmed Al-Salem", time: "2m" },
    { id: 2, type: "msg_read", user: isAr ? "سارة محمد" : "Sarah Smith", time: "5m" },
    { id: 3, type: "msg_delivered", user: isAr ? "فهد الكريم" : "Fahad K.", time: "12m" },
  ]);

  const t = {
    header: isAr ? "لوحة الدعوات المباشرة" : "Live Invitation Dashboard",
    recent_activity: isAr ? "النشاط الحديث" : "Recent Activity",
    invited: isAr ? "مدعو" : "Invited",
    confirmed: isAr ? "مؤكد" : "Confirmed",
    pending: isAr ? "قيد الانتظار" : "Pending",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newActivity = generateRandomActivity(isAr);
      setActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
      
      // Update stats based on activity
      if (newActivity.type === "rsvp_yes") {
        setStats(s => ({ ...s, confirmed: s.confirmed + 1, pending: s.pending - 1 }));
      } else if (newActivity.type === "rsvp_no") {
        setStats(s => ({ ...s, declined: s.declined + 1, pending: s.pending - 1 }));
      } else if (newActivity.type === "new_guest") {
        setStats(s => ({ ...s, total: s.total + 1, pending: s.pending + 1 }));
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isAr]);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-stone-100 overflow-hidden flex flex-col h-[400px]" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{t.header}</div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-1 p-5 pb-2">
        <StatBox label={t.invited} value={stats.total} color="bg-blue-50 text-blue-600" />
        <StatBox label={t.confirmed} value={stats.confirmed} color="bg-green-50 text-green-600" />
        <StatBox label={t.pending} value={stats.pending} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Activity Feed */}
      <div className="flex-1 p-5 pt-2 overflow-hidden relative">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bell size={12} /> {t.recent_activity}
        </h4>
        
        <div className="space-y-3 relative">
           <AnimatePresence initial={false} mode="popLayout">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, x: isAr ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-100 shadow-sm"
              >
                <ActivityIcon type={activity.type} />
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {getActivityText(activity, isAr)}
                  </p>
                  <p className="text-xs text-stone-400 text-start">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Fade out bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${color}`}>
      <div className="text-2xl font-bold tracking-tight mb-1">
        <CountUp value={value} />
      </div>
      <div className="text-[10px] uppercase font-bold opacity-80">{label}</div>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
    return (
        <motion.span
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
        >
            {value}
        </motion.span>
    )
}

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "rsvp_yes":
      return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle size={14} /></div>;
    case "rsvp_no":
      return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><XCircle size={14} /></div>;
    case "new_guest":
      return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Plus size={14} /></div>;
    case "msg_sent":
      return <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"><Check size={14} /></div>;
    case "msg_delivered":
      return <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"><CheckCheck size={14} /></div>;
    case "msg_read":
      return <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><CheckCheck size={14} /></div>;
    default:
      return <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"><Clock size={14} /></div>;
  }
}

function getActivityText(activity: Activity, isAr: boolean) {
    if (isAr) {
        switch (activity.type) {
            case "rsvp_yes": return `${activity.user} أكد الحضور`;
            case "rsvp_no": return `${activity.user} اعتذر عن الحضور`;
            case "new_guest": return `تم إضافة ${activity.user}`;
            case "msg_sent": return `تم إرسال الدعوة لـ ${activity.user}`;
            case "msg_delivered": return `تم تسليم الدعوة لـ ${activity.user}`;
            case "msg_read": return `${activity.user} قرأ الدعوة`;
            default: return "تحديث جديد";
        }
    }
    
    switch (activity.type) {
        case "rsvp_yes": return `${activity.user} confirmed attendance`;
        case "rsvp_no": return `${activity.user} declined invitation`;
        case "new_guest": return `Added ${activity.user} to guest list`;
        case "msg_sent": return `Invitation sent to ${activity.user}`;
        case "msg_delivered": return `Invitation delivered to ${activity.user}`;
        case "msg_read": return `${activity.user} read the invitation`;
        default: return "Activity update";
    }
}
