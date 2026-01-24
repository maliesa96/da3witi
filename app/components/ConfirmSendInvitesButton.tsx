"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, X, AlertTriangle, CreditCard } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";

export default function ConfirmSendInvitesButton({
  pendingToSend,
  action,
  onSent,
  eventId,
  isPaid,
}: {
  pendingToSend: number;
  action: (formData: FormData) => Promise<void>;
  onSent?: () => void;
  eventId: string;
  isPaid: boolean;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For SSR safety with portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleSendInvites = async () => {
    // If not paid, redirect to payment
    if (!isPaid) {
      setIsRedirectingToPayment(true);
      try {
        const response = await fetch('/api/checkout/send-invites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            locale,
          }),
        });

        const data = await response.json();

        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      } catch (error) {
        console.error('Checkout failed:', error);
        alert('Failed to start checkout. Please try again.');
        setIsRedirectingToPayment(false);
      }
      return;
    }

    // If paid, send invites directly
    setIsSending(true);
    try {
      await action(new FormData());
      setOpen(false);
      onSent?.();
    } catch (error) {
      console.error("Failed to send invites:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="relative group">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pendingToSend === 0}
          className={`w-full px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
            pendingToSend === 0
              ? "bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200"
              : "bg-stone-900 text-white hover:bg-stone-800 transform hover:-translate-y-0.5 cursor-pointer"
          }`}
        >
          {pendingToSend > 0 ? (
            <>
              <span>{t("send_invites") || "Send Invites"}</span>
              <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-white/20 text-white text-[10px] font-medium">
                {pendingToSend}
              </span>
            </>
          ) : (
            <span>{t("all_sent") || "All Sent"}</span>
          )}
        </button>

        {pendingToSend === 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-white text-stone-900 text-xs font-medium rounded-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none shadow-xl">
            {t("no_pending_invites")}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-white"></div>
          </div>
        )}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-9999 p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/10"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
              >
            <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
                    <AlertTriangle size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">
                      {t("confirm_send_invites_title") || "Send invites to guests?"}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {t("confirm_send_invites_desc") ||
                        "Invites will be sent to all guests whose invite hasn't been sent yet (Pending) or whose send previously failed (Failed)."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  aria-label={t("cancel")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-stone-700">
                    {t("confirm_send_invites_count", { count: pendingToSend }) ||
                      `Will send to ${pendingToSend} guests`}
                  </span>
                  <span className="text-[10px] font-medium text-stone-500">
                    {t("status_pending")} / {t("status_failed")}
                  </span>
                </div>
              </div>
              
              {!isPaid && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <CreditCard size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700 space-y-1">
                      <div>
                        {locale === 'ar' 
                          ? 'الدفع مطلوب لإرسال الدعوات. سيتم توجيهك إلى صفحة الدفع.'
                          : 'Payment required to send invites. You will be redirected to checkout.'
                        }
                      </div>
                      <div className="text-amber-600">
                        {locale === 'ar'
                          ? 'يمكنك إضافة المزيد من الضيوف لاحقاً إذا لزم الأمر.'
                          : 'You can still add more guests later if needed.'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSending || isRedirectingToPayment}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isSending || isRedirectingToPayment}
                onClick={handleSendInvites}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  isSending || isRedirectingToPayment
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : "bg-stone-900 text-white hover:bg-stone-800"
                }`}
              >
                {isSending || isRedirectingToPayment ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isPaid ? (
                  <Send size={16} />
                ) : (
                  <CreditCard size={16} />
                )}
                <span>
                  {isRedirectingToPayment 
                    ? (locale === 'ar' ? 'جاري التوجيه...' : 'Redirecting...')
                    : isSending
                    ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                    : isPaid
                    ? (t("confirm_send_invites_confirm") || "Yes, send invites")
                    : (locale === 'ar' ? 'الدفع وإرسال الدعوات' : 'Pay & Send Invites')
                  }
                </span>
              </button>
            </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

