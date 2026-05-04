'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  variant?: 'default' | 'icon';
  onDeleted?: () => void;
}

export default function DeleteEventButton({
  eventId,
  eventTitle,
  variant = 'default',
  onDeleted,
}: DeleteEventButtonProps) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete event');
      }
      setIsOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.replace(`/${locale}/dashboard`);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1.5 bg-white/90 hover:bg-red-50 border border-stone-200 hover:border-red-300 rounded-lg text-stone-400 hover:text-red-600 transition-all shadow-sm cursor-pointer backdrop-blur-sm"
          title={t('delete_event') || 'Delete Event'}
        >
          <Trash2 size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-white/70 hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-lg text-sm font-medium text-red-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Trash2 size={16} />
          {t('delete_event') || 'Delete Event'}
        </button>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-9999 p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              onClick={() => !isDeleting && setIsOpen(false)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-stone-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">
                          {t('delete_event_title') || 'Delete Event'}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {t('delete_event_subtitle') || 'This action cannot be undone'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isDeleting && setIsOpen(false)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <p className="text-sm text-stone-600">
                    {t('delete_event_confirm', { title: eventTitle }) ||
                      `Are you sure you want to delete "${eventTitle}"? This will permanently remove the event and all its guests.`}
                  </p>
                </div>

                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('deleting') || 'Deleting...'}
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        {t('delete_event') || 'Delete Event'}
                      </>
                    )}
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
