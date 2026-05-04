"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  CalendarDays,
  CreditCard,
  Send,
  ShieldX,
  Loader2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  BadgeCheck,
  Clock,
  Store,
  Plus,
  Copy,
  Check,
  X,
  Pencil,
  Save,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TimeSeriesEntry = {
  date: string;
  events: number;
  payments: number;
  invites: number;
  signups: number;
};

type StatusEntry = { status: string; count: number };

type RecentEvent = {
  id: string;
  title: string;
  createdAt: string;
  guestCountTotal: number;
  inviteCountTotal: number;
  paidAt: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  vendorId: string | null;
};

type VendorSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  adminEmails: string[];
  defaultLocale: string;
  whatsappPhoneNumberId: string | null;
  whatsappVerifyToken: string | null;
  supportWhatsapp: string | null;
  hasMetaAccessToken: boolean;
  createdAt: string;
  eventCount: number;
  paidEventCount: number;
  guestCount: number;
};

type AdminStats = {
  overview: {
    totalUsers: number;
    totalEvents: number;
    totalPaidEvents: number;
    totalGuests: number;
    totalInvitesSent: number;
  };
  timeSeries: TimeSeriesEntry[];
  statusBreakdown: StatusEntry[];
  recentEvents: RecentEvent[];
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type ChartKey = "events" | "payments" | "invites" | "signups";

const CHART_CONFIG: Record<
  ChartKey,
  { color: string; activeClass: string; label: string }
> = {
  events: {
    color: "#a855f7",
    activeClass: "bg-purple-100 text-purple-700",
    label: "Events",
  },
  payments: {
    color: "#10b981",
    activeClass: "bg-emerald-100 text-emerald-700",
    label: "Payments",
  },
  invites: {
    color: "#3b82f6",
    activeClass: "bg-blue-100 text-blue-700",
    label: "Invites",
  },
  signups: {
    color: "#f59e0b",
    activeClass: "bg-amber-100 text-amber-700",
    label: "Signups",
  },
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  sent: "#60a5fa",
  delivered: "#38bdf8",
  read: "#818cf8",
  pending: "#a8a29e",
  declined: "#f87171",
  failed: "#dc2626",
  no_reply: "#d6d3d1",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  pending: "Pending",
  declined: "Declined",
  failed: "Failed",
  no_reply: "No Reply",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/*  AnimatedCounter                                                    */
/* ------------------------------------------------------------------ */

function AnimatedCounter({
  value,
  duration = 1.5,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className="tabular-nums">{display.toLocaleString()}</span>;
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  accentColor,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  trend: number;
  accentColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-stone-200/60 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accentColor + "18" }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        {trend > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <TrendingUp size={12} />
            <span>+{formatNumber(trend)}</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-display font-bold text-stone-900 tracking-tight">
        <AnimatedCounter value={value} />
      </div>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  AreaChart                                                          */
/* ------------------------------------------------------------------ */

function AreaChart({
  data,
  activeKey,
}: {
  data: TimeSeriesEntry[];
  activeKey: ChartKey;
}) {
  const color = CHART_CONFIG[activeKey].color;
  const width = 800;
  const height = 280;
  const pad = { top: 24, right: 16, bottom: 36, left: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const values = data.map((d) => d[activeKey]);
  const maxValue = Math.max(...values, 1);

  const gridCount = 4;
  const gridStep = Math.ceil(maxValue / gridCount) || 1;
  const gridLines = Array.from(
    { length: gridCount },
    (_, i) => gridStep * (i + 1)
  );
  const effectiveMax = gridLines[gridLines.length - 1];

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: pad.top + chartH - (d[activeKey] / effectiveMax) * chartH,
  }));

  const linePath = generateSmoothPath(points);
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${pad.top + chartH}` +
    ` L ${points[0].x} ${pad.top + chartH} Z`;

  const xLabels = data
    .map((d, i) => ({ ...d, idx: i }))
    .filter((_, i) => i % 7 === 0 || i === data.length - 1);

  const gradientId = `area-grad-${activeKey}`;

  return (
    <svg
      key={activeKey}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((val, i) => {
        const y = pad.top + chartH - (val / effectiveMax) * chartH;
        return (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke="#e7e5e4"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#a8a29e"
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={pad.left}
        y1={pad.top + chartH}
        x2={width - pad.right}
        y2={pad.top + chartH}
        stroke="#d6d3d1"
      />

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* X-axis labels */}
      {xLabels.map((entry) => {
        const x =
          pad.left + (entry.idx / Math.max(data.length - 1, 1)) * chartW;
        return (
          <text
            key={entry.date}
            x={x}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#a8a29e"
          >
            {formatChartDate(entry.date)}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  DonutChart                                                         */
/* ------------------------------------------------------------------ */

function DonutChart({ data }: { data: StatusEntry[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-stone-400">
        No invite data yet
      </div>
    );
  }

  const cx = 100,
    cy = 100,
    radius = 72,
    strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce<{ segLen: number; offset: number; color: string; status: string }[]>(
    (acc, segment) => {
      const segLen = (segment.count / total) * circumference;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segLen : 0;
      acc.push({ segLen, offset, color: STATUS_COLORS[segment.status] || "#d6d3d1", status: segment.status });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.3 }}
      >
        <svg viewBox="0 0 200 200" className="w-44 h-44">
          {segments.map((seg, i) => (
              <circle
                key={seg.status}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                stroke={seg.color}
                strokeDasharray={
                  visible
                    ? `${seg.segLen} ${circumference - seg.segLen}`
                    : `0 ${circumference}`
                }
                strokeDashoffset={-seg.offset}
                style={{
                  transform: `rotate(-90deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: `stroke-dasharray 1s ease-out ${0.4 + i * 0.08}s`,
                }}
              />
          ))}
          {/* Center label */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="26"
            fontWeight="bold"
            fill="#1c1917"
          >
            {formatNumber(total)}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize="10"
            fill="#a8a29e"
          >
            total invites
          </text>
        </svg>
      </motion.div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
        {data.map((s, i) => (
          <motion.div
            key={s.status}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.06 }}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: STATUS_COLORS[s.status] || "#d6d3d1",
              }}
            />
            <span className="text-stone-500 truncate">
              {STATUS_LABELS[s.status] || s.status}
            </span>
            <span className="text-stone-800 font-semibold tabular-nums ml-auto">
              {s.count.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Events List                                                 */
/* ------------------------------------------------------------------ */

function RecentEventsList({ events }: { events: RecentEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-stone-400">
        No events yet
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <motion.a
          key={ev.id}
          href={`/en/admin/events/${ev.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/60 hover:bg-stone-100/80 transition-colors cursor-pointer"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">
              {ev.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {(ev.ownerName || ev.ownerEmail) && (
                <span className="text-xs text-stone-500 truncate max-w-[180px]">
                  {ev.ownerName ?? ev.ownerEmail}
                  {ev.ownerName && ev.ownerEmail && (
                    <span className="text-stone-400"> &middot; {ev.ownerEmail}</span>
                  )}
                </span>
              )}
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock size={10} />
                {timeAgo(ev.createdAt)}
              </span>
            </div>
          </div>
          <div className="text-xs text-stone-500 tabular-nums whitespace-nowrap flex items-center gap-1">
            <Users size={12} className="text-stone-400" />
            {ev.guestCountTotal}
          </div>
          {ev.vendorId && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-semibold">
              <Store size={10} />
              Vendor
            </span>
          )}
          {ev.paidAt ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
              <BadgeCheck size={10} />
              Paid
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-semibold">
              Free
            </span>
          )}
        </motion.a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-200/60 p-5 h-32"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-200 mb-4" />
            <div className="h-6 w-20 bg-stone-200 rounded" />
            <div className="h-3 w-16 bg-stone-100 rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/60 p-6 h-80" />
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 h-80" />
      </div>
      <div className="bg-white rounded-2xl border border-stone-200/60 p-6 h-64" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [activeChart, setActiveChart] = useState<ChartKey>("events");
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "vendors">("overview");

  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorSlug, setNewVendorSlug] = useState("");
  const [newVendorEmails, setNewVendorEmails] = useState("");
  const [newVendorLogoUrl, setNewVendorLogoUrl] = useState("");
  const [newVendorFaviconUrl, setNewVendorFaviconUrl] = useState("");
  const [newVendorLocale, setNewVendorLocale] = useState<"ar" | "en">("ar");
  const [newVendorWhatsappPhoneNumberId, setNewVendorWhatsappPhoneNumberId] = useState("");
  const [newVendorWhatsappVerifyToken, setNewVendorWhatsappVerifyToken] = useState("");
  const [newVendorSupportWhatsapp, setNewVendorSupportWhatsapp] = useState("");
  const [newVendorMetaAccessToken, setNewVendorMetaAccessToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdVendor, setCreatedVendor] = useState<{ id: string; name: string; slug: string; adminEmails: string[]; defaultLocale: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editEmails, setEditEmails] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editFaviconUrl, setEditFaviconUrl] = useState("");
  const [editLocale, setEditLocale] = useState<"ar" | "en">("ar");
  const [editWhatsappPhoneNumberId, setEditWhatsappPhoneNumberId] = useState("");
  const [editWhatsappVerifyToken, setEditWhatsappVerifyToken] = useState("");
  const [editSupportWhatsapp, setEditSupportWhatsapp] = useState("");
  const [editMetaAccessToken, setEditMetaAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [statsRes, vendorsRes] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/vendors", { cache: "no-store", credentials: "include" }),
      ]);
      if (statsRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (!statsRes.ok) {
        throw new Error(`Request failed: ${statsRes.status}`);
      }
      const data = (await statsRes.json()) as AdminStats;
      setStats(data);

      if (vendorsRes.ok) {
        const vData = (await vendorsRes.json()) as { vendors: VendorSummary[] };
        setVendors(vData.vendors);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleCreateVendor = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const emails = newVendorEmails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newVendorName,
          slug: newVendorSlug,
          adminEmails: emails,
          logoUrl: newVendorLogoUrl || undefined,
          faviconUrl: newVendorFaviconUrl || undefined,
          defaultLocale: newVendorLocale,
          whatsappPhoneNumberId: newVendorWhatsappPhoneNumberId || undefined,
          whatsappVerifyToken: newVendorWhatsappVerifyToken || undefined,
          supportWhatsapp: newVendorSupportWhatsapp || undefined,
          metaAccessToken: newVendorMetaAccessToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create vendor");
        return;
      }

      setCreatedVendor(data.vendor);
      setShowCreateVendor(false);
      setNewVendorName("");
      setNewVendorSlug("");
      setNewVendorEmails("");
      setNewVendorLogoUrl("");
      setNewVendorFaviconUrl("");
      setNewVendorLocale("ar");
      setNewVendorWhatsappPhoneNumberId("");
      setNewVendorWhatsappVerifyToken("");
      setNewVendorSupportWhatsapp("");
      setNewVendorMetaAccessToken("");
      void fetchStats();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const startEditing = (vendor: VendorSummary) => {
    setEditingVendorId(vendor.id);
    setEditName(vendor.name);
    setEditSlug(vendor.slug);
    setEditEmails(vendor.adminEmails.join(", "));
    setEditLogoUrl(vendor.logoUrl || "");
    setEditFaviconUrl(vendor.faviconUrl || "");
    setEditLocale(vendor.defaultLocale as "ar" | "en");
    setEditWhatsappPhoneNumberId(vendor.whatsappPhoneNumberId || "");
    setEditWhatsappVerifyToken(vendor.whatsappVerifyToken || "");
    setEditSupportWhatsapp(vendor.supportWhatsapp || "");
    setEditMetaAccessToken("");
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingVendorId(null);
    setEditError(null);
  };

  const handleSaveVendor = async () => {
    if (!editingVendorId) return;
    setEditError(null);
    setSaving(true);
    try {
      const emails = editEmails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/vendors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingVendorId,
          name: editName,
          slug: editSlug,
          adminEmails: emails,
          logoUrl: editLogoUrl || undefined,
          faviconUrl: editFaviconUrl || undefined,
          defaultLocale: editLocale,
          whatsappPhoneNumberId: editWhatsappPhoneNumberId || undefined,
          whatsappVerifyToken: editWhatsappVerifyToken || undefined,
          supportWhatsapp: editSupportWhatsapp || undefined,
          ...(editMetaAccessToken ? { metaAccessToken: editMetaAccessToken } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update vendor");
        return;
      }

      setEditingVendorId(null);
      void fetchStats();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  /* ---- Forbidden ---- */
  if (forbidden) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center animate-fade-in">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-6"
        >
          <ShieldX size={36} className="text-red-400" />
        </motion.div>
        <h1 className="text-2xl font-display font-bold text-stone-900 mb-2">
          Access Denied
        </h1>
        <p className="text-stone-500">
          This dashboard is restricted to authorized administrators.
        </p>
      </div>
    );
  }

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-24">
        <div className="mb-8 flex items-center gap-3">
          <Loader2 size={20} className="text-stone-400 animate-spin" />
          <span className="text-sm text-stone-400">
            Loading admin dashboard...
          </span>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !stats) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-6">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-display font-bold text-stone-900 mb-2">
          Failed to load
        </h1>
        <p className="text-stone-500 mb-6 text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  /* ---- Compute 30-day trends ---- */
  const trend = {
    signups: stats.timeSeries.reduce((s, d) => s + d.signups, 0),
    events: stats.timeSeries.reduce((s, d) => s + d.events, 0),
    payments: stats.timeSeries.reduce((s, d) => s + d.payments, 0),
    invites: stats.timeSeries.reduce((s, d) => s + d.invites, 0),
  };

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-24 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-900 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Platform overview &middot; Last 30 days
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="text-stone-400 hover:text-stone-600 p-2 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </motion.div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/en/admin/whatsapp"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm w-fit"
        >
          <Send size={14} />
          WhatsApp Messages
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1.5 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "vendors"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          <Store size={14} />
          Vendors
          {vendors.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "vendors" ? "bg-white/20" : "bg-stone-200"
            }`}>
              {vendors.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "vendors" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mb-8"
        >
          {/* Created vendor env config */}
          {createdVendor && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-emerald-600" />
                  <h3 className="text-lg font-semibold text-stone-900">
                    {createdVendor.name} created
                  </h3>
                </div>
                <button
                  onClick={() => setCreatedVendor(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-stone-600 mb-3">
                Add this environment variable to the vendor&apos;s deployment. Locale, name, logo, favicon, and WhatsApp config are read from the DB automatically.
              </p>
              <div className="space-y-2">
                {[
                  { key: "VENDOR_ID", value: createdVendor.id },
                ].map(({ key, value }) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 px-3 py-2 font-mono text-xs"
                  >
                    <span className="text-emerald-700 font-semibold shrink-0">{key}</span>
                    <span className="text-stone-400">=</span>
                    <span className="text-stone-700 truncate flex-1">{value}</span>
                    <button
                      onClick={() => copyToClipboard(`${key}=${value}`, key)}
                      className="shrink-0 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                      title="Copy"
                    >
                      {copiedField === key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Create vendor form */}
          {showCreateVendor ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-stone-200/60 p-5 md:p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-stone-900">New Vendor</h3>
                <button
                  onClick={() => { setShowCreateVendor(false); setCreateError(null); }}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Business name *
                  </label>
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => {
                      setNewVendorName(e.target.value);
                      if (!newVendorSlug || newVendorSlug === newVendorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
                        setNewVendorSlug(e.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                      }
                    }}
                    placeholder="Al-Faris Events"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={newVendorSlug}
                    onChange={(e) => setNewVendorSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="al-faris-events"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Admin email(s) *
                  </label>
                  <input
                    type="text"
                    value={newVendorEmails}
                    onChange={(e) => setNewVendorEmails(e.target.value)}
                    placeholder="admin@vendor.com, manager@vendor.com"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">Comma-separated</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Logo URL <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={newVendorLogoUrl}
                    onChange={(e) => setNewVendorLogoUrl(e.target.value)}
                    placeholder="https://vendor.com/logo.svg"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Favicon URL <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={newVendorFaviconUrl}
                    onChange={(e) => setNewVendorFaviconUrl(e.target.value)}
                    placeholder="https://vendor.com/favicon.ico"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Default language
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewVendorLocale("ar")}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                        newVendorLocale === "ar"
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewVendorLocale("en")}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                        newVendorLocale === "en"
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-stone-100 pt-4 mt-1">
                  <p className="text-xs font-medium text-stone-500 mb-3">
                    WhatsApp Integration <span className="text-stone-400">(optional)</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Phone Number ID</label>
                      <input
                        type="text"
                        value={newVendorWhatsappPhoneNumberId}
                        onChange={(e) => setNewVendorWhatsappPhoneNumberId(e.target.value)}
                        placeholder="e.g. 123456789012345"
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Verify Token</label>
                      <input
                        type="text"
                        value={newVendorWhatsappVerifyToken}
                        onChange={(e) => setNewVendorWhatsappVerifyToken(e.target.value)}
                        placeholder="e.g. my-secret-token"
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">Meta Access Token</label>
                    <input
                      type="password"
                      value={newVendorMetaAccessToken}
                      onChange={(e) => setNewVendorMetaAccessToken(e.target.value)}
                      placeholder="Paste the vendor's permanent access token"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                    />
                    <p className="text-xs text-stone-400 mt-1">Stored encrypted. Required for sending from this vendor&apos;s WhatsApp number.</p>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-stone-100 pt-4 mt-1">
                  <p className="text-xs font-medium text-stone-500 mb-3">
                    Landing Page <span className="text-stone-400">(optional)</span>
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">Support WhatsApp Number</label>
                    <input
                      type="text"
                      value={newVendorSupportWhatsapp}
                      onChange={(e) => setNewVendorSupportWhatsapp(e.target.value)}
                      placeholder="e.g. 966500000000"
                      className="w-full max-w-sm px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                    />
                    <p className="text-xs text-stone-400 mt-1">International format without + sign. Shown on the landing page &quot;Get in touch&quot; button.</p>
                  </div>
                </div>
              </div>

              {createError && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} />
                  {createError}
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleCreateVendor}
                  disabled={creating || !newVendorName.trim() || !newVendorSlug.trim() || !newVendorEmails.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Create Vendor
                </button>
                <button
                  onClick={() => { setShowCreateVendor(false); setCreateError(null); }}
                  className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => { setShowCreateVendor(true); setCreatedVendor(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={16} />
              New Vendor
            </button>
          )}

          {/* Vendor list */}
          {vendors.map((vendor, i) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-stone-200/60 p-5 md:p-6 shadow-sm"
            >
              {editingVendorId === vendor.id ? (
                /* ---- Edit mode ---- */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-stone-900">Edit Vendor</h3>
                    <button
                      onClick={cancelEditing}
                      className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Business name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Slug</label>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Admin email(s)</label>
                      <input
                        type="text"
                        value={editEmails}
                        onChange={(e) => setEditEmails(e.target.value)}
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">Comma-separated</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Logo URL <span className="text-stone-400">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={editLogoUrl}
                        onChange={(e) => setEditLogoUrl(e.target.value)}
                        placeholder="https://vendor.com/logo.svg"
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Favicon URL <span className="text-stone-400">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={editFaviconUrl}
                        onChange={(e) => setEditFaviconUrl(e.target.value)}
                        placeholder="https://vendor.com/favicon.ico"
                        className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Default language</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditLocale("ar")}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                            editLocale === "ar"
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          العربية
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditLocale("en")}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                            editLocale === "en"
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2 border-t border-stone-100 pt-4 mt-1">
                      <p className="text-xs font-medium text-stone-500 mb-3">
                        WhatsApp Integration <span className="text-stone-400">(optional)</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1.5">Phone Number ID</label>
                          <input
                            type="text"
                            value={editWhatsappPhoneNumberId}
                            onChange={(e) => setEditWhatsappPhoneNumberId(e.target.value)}
                            placeholder="e.g. 123456789012345"
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1.5">Verify Token</label>
                          <input
                            type="text"
                            value={editWhatsappVerifyToken}
                            onChange={(e) => setEditWhatsappVerifyToken(e.target.value)}
                            placeholder="e.g. my-secret-token"
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">Meta Access Token</label>
                        <input
                          type="password"
                          value={editMetaAccessToken}
                          onChange={(e) => setEditMetaAccessToken(e.target.value)}
                          placeholder={vendor.hasMetaAccessToken ? "Token is set. Enter a new value to replace it." : "Paste the vendor's permanent access token"}
                          className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                        />
                        <p className="text-xs text-stone-400 mt-1">
                          {vendor.hasMetaAccessToken
                            ? "A token is already stored. Leave blank to keep the current token."
                            : "Stored encrypted. Required for sending from this vendor\u2019s WhatsApp number."}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-2 border-t border-stone-100 pt-4 mt-1">
                      <p className="text-xs font-medium text-stone-500 mb-3">
                        Landing Page <span className="text-stone-400">(optional)</span>
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">Support WhatsApp Number</label>
                        <input
                          type="text"
                          value={editSupportWhatsapp}
                          onChange={(e) => setEditSupportWhatsapp(e.target.value)}
                          placeholder="e.g. 966500000000"
                          className="w-full max-w-sm px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                        />
                        <p className="text-xs text-stone-400 mt-1">International format without + sign. Shown on the landing page &quot;Get in touch&quot; button.</p>
                      </div>
                    </div>
                  </div>

                  {editError && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} />
                      {editError}
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={handleSaveVendor}
                      disabled={saving || !editName.trim() || !editSlug.trim() || !editEmails.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- View mode ---- */
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">{vendor.name}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {vendor.slug} &middot; {vendor.adminEmails.join(", ")} &middot;{" "}
                        <span className="uppercase">{vendor.defaultLocale}</span>
                      </p>
                      <button
                        onClick={() => copyToClipboard(vendor.id, `vid-${vendor.id}`)}
                        className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] text-stone-400 hover:text-stone-600 font-mono transition-colors cursor-pointer"
                        title="Copy Vendor ID"
                      >
                        {copiedField === `vid-${vendor.id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {vendor.id}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(vendor)}
                        className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Edit vendor"
                      >
                        <Pencil size={14} />
                      </button>
                      <span className="text-xs text-stone-400">{timeAgo(vendor.createdAt)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="rounded-xl bg-stone-50 p-3 text-center">
                      <div className="text-xl font-bold text-stone-900 tabular-nums">{vendor.eventCount}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">Events</div>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 text-center">
                      <div className="text-xl font-bold text-stone-900 tabular-nums">{vendor.guestCount}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">Guests</div>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 text-center">
                      <div className="text-xl font-bold text-stone-900 tabular-nums">{vendor.paidEventCount}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">Paid</div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}

          {vendors.length === 0 && !showCreateVendor && (
            <div className="text-center py-12 text-stone-400 text-sm">
              No vendors yet. Create your first one above.
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "overview" && <>
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.overview.totalUsers}
          trend={trend.signups}
          accentColor="#a855f7"
          delay={0.05}
        />
        <StatCard
          icon={CalendarDays}
          label="Total Events"
          value={stats.overview.totalEvents}
          trend={trend.events}
          accentColor="#3b82f6"
          delay={0.1}
        />
        <StatCard
          icon={CreditCard}
          label="Paid Events"
          value={stats.overview.totalPaidEvents}
          trend={trend.payments}
          accentColor="#10b981"
          delay={0.15}
        />
        <StatCard
          icon={Send}
          label="Total Invites"
          value={stats.overview.totalInvitesSent}
          trend={trend.invites}
          accentColor="#f59e0b"
          delay={0.2}
        />
      </div>

      {/* ── Chart + Donut Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/60 p-5 md:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-base font-semibold text-stone-900">
              Activity &middot; Last 30 Days
            </h2>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(CHART_CONFIG) as ChartKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveChart(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    activeChart === key
                      ? CHART_CONFIG[key].activeClass
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {CHART_CONFIG[key].label}
                </button>
              ))}
            </div>
          </div>
          <AreaChart data={stats.timeSeries} activeKey={activeChart} />
        </motion.div>

        {/* Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-stone-200/60 p-5 md:p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-stone-900 mb-5">
            Invite Status
          </h2>
          <DonutChart data={stats.statusBreakdown} />
        </motion.div>
      </div>

      {/* ── Recent Events ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white rounded-2xl border border-stone-200/60 p-5 md:p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-stone-900 mb-4">
          Recent Events
        </h2>
        <RecentEventsList events={stats.recentEvents} />
      </motion.div>
      </>}
    </div>
  );
}
