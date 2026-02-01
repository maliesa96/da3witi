"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Plus, 
  Check, 
  CheckCheck, 
  Bell,
  QrCode,
  Loader2
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useRealtimeSubscription,
  type BroadcastGuestPayload as RealtimeGuestPayload,
} from "@/lib/supabase/RealtimeProvider";

export type ActivityType =
  | "guest_added"
  | "invite_sent"
  | "invite_delivered"
  | "invite_read"
  | "confirmed"
  | "declined"
  | "checked_in";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  guestId: string;
  guestName: string;
  timestamp: string;
};

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "confirmed":
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
          <CheckCircle size={14} />
        </div>
      );
    case "declined":
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
          <XCircle size={14} />
        </div>
      );
    case "guest_added":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <Plus size={14} />
        </div>
      );
    case "invite_sent":
      return (
        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
          <Check size={14} />
        </div>
      );
    case "invite_delivered":
      return (
        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
          <CheckCheck size={14} />
        </div>
      );
    case "invite_read":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
          <CheckCheck size={14} />
        </div>
      );
    case "checked_in":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
          <QrCode size={14} />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
          <Bell size={14} />
        </div>
      );
  }
}

const ActivityRow = memo(function ActivityRow({
  activity,
  isNew,
  locale,
}: {
  activity: ActivityItem;
  isNew: boolean;
  locale: string;
}) {
  const t = useTranslations("Dashboard");
  const isAr = locale === "ar";

  const getActivityText = (item: ActivityItem) => {
    switch (item.type) {
      case "confirmed":
        return <><span className="font-semibold">{item.guestName}</span> {t("activity_confirmed")}</>;
      case "declined":
        return <><span className="font-semibold">{item.guestName}</span> {t("activity_declined")}</>;
      case "guest_added":
        return <>{t("activity_added")} <span className="font-semibold">{item.guestName}</span></>;
      case "invite_sent":
        return <>{t("activity_sent")} <span className="font-semibold">{item.guestName}</span></>;
      case "invite_delivered":
        return <>{t("activity_delivered")} <span className="font-semibold">{item.guestName}</span></>;
      case "invite_read":
        return <><span className="font-semibold">{item.guestName}</span> {t("activity_read")}</>;
      case "checked_in":
        return <><span className="font-semibold">{item.guestName}</span> {t("activity_checked_in")}</>;
      default:
        return <>{t("activity_update")}</>;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isAr ? "الآن" : "Just now";
    if (diffMins < 60) return isAr ? `${diffMins} د` : `${diffMins}m`;
    if (diffHours < 24) return isAr ? `${diffHours} س` : `${diffHours}h`;
    return isAr ? `${diffDays} ي` : `${diffDays}d`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: isAr ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm transition-colors ${
        isNew
          ? "bg-amber-50/50 border-amber-200"
          : "bg-white border-stone-100"
      }`}
    >
      <ActivityIcon type={activity.type} />
      <div className="flex-1 min-w-0 text-start">
        <p className="text-sm font-medium text-stone-800 truncate">
          {getActivityText(activity)}
        </p>
        <p className="text-xs text-stone-400">{getRelativeTime(activity.timestamp)}</p>
      </div>
      {isNew && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
          {isAr ? "جديد" : "NEW"}
        </span>
      )}
    </motion.div>
  );
});

type RecentActivityProps = {
  eventId: string;
  isPaid: boolean;
  maxItems?: number;
};

export default function RecentActivity({
  eventId,
  isPaid,
  maxItems = 10,
}: RecentActivityProps) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial activities
  useEffect(() => {
    let cancelled = false;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/events/${encodeURIComponent(eventId)}/activity?limit=${maxItems}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        if (!cancelled) {
          setActivities(data.activities || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [eventId, maxItems]);

  // Clear "new" badge after 5 seconds
  useEffect(() => {
    if (newActivityIds.size === 0) return;

    const timer = setTimeout(() => {
      setNewActivityIds(new Set());
    }, 5000);

    return () => clearTimeout(timer);
  }, [newActivityIds]);

  // Handle realtime guest updates (via Broadcast)
  const handleRealtimeGuestUpdate = useCallback(
    (payload: RealtimeGuestPayload) => {
      const oldStatus = payload.oldStatus;
      const newStatus = payload.status;

      // Only create activity if status changed
      if (oldStatus && oldStatus !== newStatus) {
        let type: ActivityType | null = null;

        if (newStatus === "sent") type = "invite_sent";
        else if (newStatus === "delivered") type = "invite_delivered";
        else if (newStatus === "read") type = "invite_read";
        else if (newStatus === "confirmed") type = "confirmed";
        else if (newStatus === "declined") type = "declined";

        if (type) {
          const newActivity: ActivityItem = {
            id: `${payload.id}-${type}-${Date.now()}`,
            type,
            guestId: payload.id,
            guestName: payload.name,
            timestamp: new Date().toISOString(),
          };

          setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
          setNewActivityIds((prev) => new Set([...prev, newActivity.id]));
        }
      }

      // Check-in activity
      if (payload.checkedIn) {
        const newActivity: ActivityItem = {
          id: `${payload.id}-checkedin-${Date.now()}`,
          type: "checked_in",
          guestId: payload.id,
          guestName: payload.name,
          timestamp: new Date().toISOString(),
        };

        setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
        setNewActivityIds((prev) => new Set([...prev, newActivity.id]));
      }
    },
    [maxItems]
  );

  const handleRealtimeGuestInsert = useCallback(
    (payload: RealtimeGuestPayload) => {
      const newActivity: ActivityItem = {
        id: `${payload.id}-added-${Date.now()}`,
        type: "guest_added",
        guestId: payload.id,
        guestName: payload.name,
        timestamp: new Date().toISOString(),
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
      setNewActivityIds((prev) => new Set([...prev, newActivity.id]));
    },
    [maxItems]
  );

  // Subscribe to shared realtime channel (managed by RealtimeProvider in parent)
  const { isConnected } = useRealtimeSubscription({
    onGuestUpdate: handleRealtimeGuestUpdate,
    onGuestInsert: handleRealtimeGuestInsert,
  });

  // Use isConnected to determine if we're live (fallback to isPaid for initial render)
  const isLive = isConnected || isPaid;

  if (isLoading) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Bell size={12} />
            {t("recent_activity")}
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Bell size={12} />
            {t("recent_activity")}
          </h3>
        </div>
        <p className="text-sm text-stone-500 text-center py-8">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
          <Bell size={12} />
          {t("recent_activity")}
        </h3>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-stone-300"}`} />
            {isAr ? "مباشر" : "Live"}
          </span>
        )}
      </div>

      {/* Activity Feed */}
      <div className="p-3 overflow-y-auto flex-1">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={24} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">
              {isAr ? "لا يوجد نشاط بعد" : "No activity yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {activities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  isNew={newActivityIds.has(activity.id)}
                  locale={locale}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
