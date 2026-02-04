import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  Clock,
  Plus,
  QrCode,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Centralized status configuration for consistent icons and colors
 * Used by: Stats cards, Guest list status column, Activity feed
 */

export type StatusKey =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "confirmed"
  | "declined"
  | "failed"
  | "no_reply"
  // Activity-specific types
  | "guest_added"
  | "checked_in";

export type StatusConfig = {
  icon: LucideIcon;
  /** Icon color class (e.g., "text-amber-600") */
  iconColor: string;
  /** Background color class (e.g., "bg-amber-50") */
  bgColor: string;
  /** Border color class (e.g., "border-amber-100") */
  borderColor: string;
  /** Hover background color class (e.g., "hover:bg-amber-100") */
  hoverBgColor: string;
  /** Active tint for stat cards (e.g., "bg-amber-50/70") */
  activeTint: string;
};

export const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  pending: {
    icon: Clock,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    hoverBgColor: "hover:bg-amber-100",
    activeTint: "bg-amber-50/70",
  },
  sent: {
    icon: Check,
    iconColor: "text-stone-500",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-100",
    hoverBgColor: "hover:bg-stone-100",
    activeTint: "bg-stone-50/70",
  },
  delivered: {
    icon: CheckCheck,
    iconColor: "text-stone-500",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-100",
    hoverBgColor: "hover:bg-stone-100",
    activeTint: "bg-stone-50/70",
  },
  read: {
    icon: CheckCheck,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    hoverBgColor: "hover:bg-blue-100",
    activeTint: "bg-blue-50/70",
  },
  confirmed: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-100",
    hoverBgColor: "hover:bg-green-100",
    activeTint: "bg-green-50/70",
  },
  declined: {
    icon: XCircle,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-100",
    hoverBgColor: "hover:bg-red-100",
    activeTint: "bg-red-50/70",
  },
  failed: {
    icon: AlertCircle,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
    hoverBgColor: "hover:bg-orange-100",
    activeTint: "bg-orange-50/70",
  },
  no_reply: {
    icon: Bell,
    iconColor: "text-stone-400",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-200",
    hoverBgColor: "hover:bg-stone-100",
    activeTint: "bg-stone-50/70",
  },
  // Activity-specific types
  guest_added: {
    icon: Plus,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
    hoverBgColor: "hover:bg-blue-200",
    activeTint: "bg-blue-50/70",
  },
  checked_in: {
    icon: QrCode,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
    hoverBgColor: "hover:bg-purple-200",
    activeTint: "bg-purple-50/70",
  },
};

/**
 * Get status configuration, with fallback to no_reply for unknown statuses
 */
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.no_reply;
}

/**
 * Render the status icon with proper sizing and color
 */
export function StatusIcon({
  status,
  size = 12,
  className = "",
}: {
  status: string;
  size?: number;
  className?: string;
}) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return <Icon size={size} className={`${config.iconColor} ${className}`} />;
}

/**
 * Get combined pill classes for status badges
 */
export function getStatusPillClasses(status: string): string {
  const config = getStatusConfig(status);
  return `${config.bgColor} ${config.iconColor} ${config.borderColor} ${config.hoverBgColor}`;
}

/**
 * Get icon background classes for stat cards
 */
export function getStatCardIconClasses(status: string): string {
  const config = getStatusConfig(status);
  return `${config.bgColor} border ${config.borderColor} ${config.iconColor}`;
}
