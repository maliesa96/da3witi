"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, UserCheck } from "lucide-react";
import { addAttendant, removeAttendant } from "@/app/[locale]/dashboard/actions";

export default function AttendantManager({
  eventId,
  initialEmails,
}: {
  eventId: string;
  initialEmails: string[];
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleAdd = useCallback(async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;

    setIsAdding(true);
    setFeedback(null);
    try {
      await addAttendant(eventId, email, locale as "en" | "ar");
      setEmails((prev) => [...prev, email]);
      setNewEmail("");
      setFeedback({ type: "success", message: t("attendant_added") });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ALREADY_ADDED") {
        setFeedback({ type: "error", message: t("attendant_already_added") });
      } else {
        setFeedback({ type: "error", message: t("attendant_add_failed") });
      }
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsAdding(false);
    }
  }, [eventId, newEmail, locale, t]);

  const handleRemove = useCallback(
    async (email: string) => {
      setRemovingEmail(email);
      try {
        await removeAttendant(eventId, email);
        setEmails((prev) => prev.filter((e) => e !== email));
      } catch {
        // silently fail
      } finally {
        setRemovingEmail(null);
      }
    },
    [eventId]
  );

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <UserCheck size={16} className="text-stone-500" />
        <h3 className="font-medium text-stone-900 text-sm">{t("attendants")}</h3>
      </div>
      <p className="text-xs text-stone-500 mb-4">{t("attendants_desc")}</p>

      {/* Add form */}
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={t("add_attendant_placeholder")}
          className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 bg-stone-50"
          disabled={isAdding}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || !newEmail.trim()}
          className="px-3 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAdding ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          {isAdding ? t("attendant_adding") : t("add_attendant")}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-xs px-3 py-2 rounded-lg mb-3 ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* List */}
      {emails.length === 0 ? (
        <p className="text-xs text-stone-400 italic">{t("attendant_none")}</p>
      ) : (
        <ul className="space-y-2">
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg"
            >
              <span className="text-sm text-stone-700 truncate">{email}</span>
              <button
                type="button"
                onClick={() => handleRemove(email)}
                disabled={removingEmail === email}
                className="text-xs text-stone-400 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {removingEmail === email ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                {t("attendant_remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
