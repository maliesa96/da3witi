'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { addGuest } from '../[locale]/dashboard/actions';

interface AddGuestFormProps {
  eventId: string;
  locale: 'en' | 'ar';
}

export default function AddGuestForm({ eventId, locale }: AddGuestFormProps) {
  const t = useTranslations('Dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    try {
      await addGuest(eventId, { name, phone }, locale);
      setName('');
      setPhone('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add guest:', error);
      alert('Failed to add guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        {t('add_guest')}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-stone-900">{t('add_guest_title')}</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              {t('guest_name')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('guest_name_placeholder')}
              className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:bg-white focus:border-stone-400 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              {t('guest_phone')}
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:bg-white focus:border-stone-400 outline-none transition-all dir-ltr"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t('confirm_add')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

