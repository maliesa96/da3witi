'use client';

import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import ContactImport from '@/app/components/ContactImport';
import { addGuests } from '../[locale]/dashboard/actions';

type Cell = string | number | null;

interface AddGuestFormProps {
  eventId: string;
  buttonClassName?: string;
  onGuestsAdded?: (guests: Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
    checkedIn: boolean;
    whatsappMessageId: string | null;
  }>) => void;
}

export default function AddGuestForm({ eventId, buttonClassName, onGuestsAdded }: AddGuestFormProps) {
  const t = useTranslations('Dashboard');
  const tw = useTranslations('Wizard.step1');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'file' | 'manual'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For SSR safety with portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open
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

  // Manual guests (wizard-like)
  const [manualInvites, setManualInvites] = useState<Array<{ name: string; phone: string }>>([
    { name: '', phone: '' },
  ]);

  // File import state (lifted for ContactImport)
  const [importData, setImportData] = useState<Cell[][]>([]);
  const [importNameCol, setImportNameCol] = useState<number | null>(null);
  const [importPhoneCol, setImportPhoneCol] = useState<number | null>(null);
  const [importStartRow, setImportStartRow] = useState(0);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [fileContacts, setFileContacts] = useState<Array<{ name: string; phone: string }>>([]);

  const manualCount = useMemo(
    () => manualInvites.filter(i => i.name.trim() || i.phone.trim()).length,
    [manualInvites]
  );
  const fileCount = fileContacts.length;
  const totalCount = mode === 'file' ? fileCount : manualCount;

  const closeAndReset = () => {
    setIsOpen(false);
    setIsSubmitting(false);
    setMode('manual');
    setManualInvites([{ name: '', phone: '' }]);
    setImportData([]);
    setImportNameCol(null);
    setImportPhoneCol(null);
    setImportStartRow(0);
    setImportFileName(null);
    setFileContacts([]);
  };

  const submitGuests = async (guests: Array<{ name: string; phone: string }>) => {
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      const res = await addGuests(eventId, guests);
      if (res?.success) {
        onGuestsAdded?.(res.guests);
      }
      closeAndReset();
    } catch (error) {
      console.error('Failed to add guests:', error);
      alert('Failed to add guests. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={
          buttonClassName ??
          "w-full md:w-auto px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        <Plus size={16} />
        {t('add_guest')}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-[9999] p-4 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-white/10 max-h-[85vh] flex flex-col"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
            <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">{t('add_guest_title')}</h3>
                  <p className="text-xs text-stone-500 mt-1">{tw('desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={closeAndReset}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  aria-label={t('cancel')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-6 overflow-y-auto">
              <div className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() => setMode('file')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      mode === 'file'
                        ? 'text-stone-900 border-b-2 border-stone-900 bg-white'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {tw('tab_file')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      mode === 'manual'
                        ? 'text-stone-900 border-b-2 border-stone-900 bg-white'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {tw('tab_manual')}
                  </button>
                </div>

                <div className="p-6 bg-white">
                  {mode === 'file' ? (
                    <div className="space-y-4">
                      {fileContacts.length === 0 ? (
                        <>
                          <ContactImport
                            onContactsLoaded={(contacts) => setFileContacts(contacts)}
                            data={importData}
                            setData={setImportData}
                            nameCol={importNameCol}
                            setNameCol={setImportNameCol}
                            phoneCol={importPhoneCol}
                            setPhoneCol={setImportPhoneCol}
                            startRow={importStartRow}
                            setStartRow={setImportStartRow}
                            fileName={importFileName}
                            setFileName={setImportFileName}
                          />

                          {/* Excel Sheet Mockup (matches wizard) */}
                          <div className="mt-6 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex items-center gap-2" dir="ltr">
                              <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                              </div>
                              <div className="ml-4 text-[10px] font-medium text-stone-500 bg-white px-3 py-0.5 rounded border border-stone-200 flex items-center gap-1.5">
                                <FileSpreadsheet size={12} className="text-green-600" />
                                {importFileName ?? 'guests.xlsx'}
                              </div>
                            </div>
                            <div className="overflow-x-auto" dir="ltr">
                              <table className="w-full text-sm text-left">
                                <thead>
                                  <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="px-4 py-2 w-12 text-center text-xs font-medium text-stone-400 border-r border-stone-200">#</th>
                                    <th className="px-4 py-2 font-medium text-stone-600 border-r border-stone-200 w-1/2">A</th>
                                    <th className="px-4 py-2 font-medium text-stone-600 w-1/2">B</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  <tr className="bg-stone-50/50">
                                    <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">1</td>
                                    <td className="px-4 py-2 font-medium text-stone-900 border-r border-stone-200 bg-blue-50/30 text-right">{tw('manual_name')}</td>
                                    <td className="px-4 py-2 font-medium text-stone-900 bg-green-50/30 text-right">{tw('manual_phone')}</td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">2</td>
                                    <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'محمد السالم' : 'Mohammed Al-Salem'}</td>
                                    <td className="px-4 py-2 text-stone-600 font-mono text-xs text-right" dir="ltr">+966512992124</td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">3</td>
                                    <td className="px-4 py-2 text-stone-600 border-r border-stone-200 text-right">{locale === 'ar' ? 'عبدالله الدوسري' : 'Abdullah Al-Dosari'}</td>
                                    <td className="px-4 py-2 text-stone-600 font-mono text-xs text-right" dir="ltr">+96599828842</td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2 text-center text-xs font-medium text-stone-400 border-r border-stone-200 bg-stone-50">4</td>
                                    <td className="px-4 py-2 text-stone-400 italic border-r border-stone-200 text-right">...</td>
                                    <td className="px-4 py-2 text-stone-400 italic text-right">...</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                                <Upload size={16} className="text-stone-500" />
                                {importFileName ?? tw('tab_file')}
                              </div>
                              <div className="text-xs text-stone-600 mt-1">
                                {tw('added_contacts', { count: fileContacts.length })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFileContacts([]);
                                setImportData([]);
                                setImportNameCol(null);
                                setImportPhoneCol(null);
                                setImportStartRow(0);
                                setImportFileName(null);
                              }}
                              className="text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 bg-white px-3 py-2 rounded-lg"
                            >
                              {tw('change_file')}
                            </button>
                          </div>

                          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
                            <table className="w-full text-sm">
                              <thead className="bg-stone-50 text-xs text-stone-500">
                                <tr>
                                  <th className="px-3 py-2 text-start">{tw('manual_name')}</th>
                                  <th className="px-3 py-2 text-start">{tw('manual_phone')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {fileContacts.slice(0, 5).map((c, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-stone-900">{c.name}</td>
                                    <td className="px-3 py-2 text-stone-600 font-mono dir-ltr">{c.phone}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {fileContacts.length > 5 && (
                              <div className="px-3 py-2 text-xs text-stone-500 bg-stone-50">
                                +{fileContacts.length - 5} {tw('more_rows', { count: fileContacts.length - 5 })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {manualInvites.map((invite, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              {tw('manual_name')}
                            </label>
                            <input
                              type="text"
                              value={invite.name}
                              onChange={(e) => {
                                const next = [...manualInvites];
                                next[index] = { ...next[index], name: e.target.value };
                                setManualInvites(next);
                              }}
                              placeholder={tw('manual_name')}
                              className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              {tw('manual_phone')}
                            </label>
                            <input
                              type="tel"
                              value={invite.phone}
                              onChange={(e) => {
                                const next = [...manualInvites];
                                next[index] = { ...next[index], phone: e.target.value };
                                setManualInvites(next);
                              }}
                              placeholder="+96512345678"
                              className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm dir-ltr"
                            />
                          </div>
                          {manualInvites.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualInvites(manualInvites.filter((_, i) => i !== index))}
                              className="mt-7 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setManualInvites([...manualInvites, { name: '', phone: '' }])}
                        className="mt-2 w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Plus size={18} />
                        <span>{tw('add_guest')}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-stone-600">
                    {tw('added_contacts', { count: totalCount })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeAndReset}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || totalCount === 0 || !eventId}
                      onClick={() => {
                        const guests = mode === 'file'
                          ? fileContacts
                          : manualInvites.filter(i => i.name.trim() || i.phone.trim());
                        submitGuests(guests);
                      }}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        isSubmitting || totalCount === 0 || !eventId
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        t('confirm_add')
                      )}
                    </button>
                  </div>
                </div>
              </div>
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

