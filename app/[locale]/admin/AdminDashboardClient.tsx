"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.3 }}
      >
        <svg viewBox="0 0 200 200" className="w-44 h-44">
          {data.map((segment, i) => {
            const segLen = (segment.count / total) * circumference;
            const offset = cumulative;
            cumulative += segLen;
            const segColor =
              STATUS_COLORS[segment.status] || "#d6d3d1";

            return (
              <circle
                key={segment.status}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                stroke={segColor}
                strokeDasharray={
                  visible
                    ? `${segLen} ${circumference - segLen}`
                    : `0 ${circumference}`
                }
                strokeDashoffset={-offset}
                style={{
                  transform: `rotate(-90deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: `stroke-dasharray 1s ease-out ${0.4 + i * 0.08}s`,
                }}
              />
            );
          })}
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
        <motion.div
          key={ev.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/60 hover:bg-stone-100/80 transition-colors"
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
        </motion.div>
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

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const res = await fetch("/api/admin/stats", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = (await res.json()) as AdminStats;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

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
      <a
        href="/en/admin/whatsapp"
        className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm w-fit"
      >
        <Send size={14} />
        WhatsApp Messages
      </a>

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
    </div>
  );
}
