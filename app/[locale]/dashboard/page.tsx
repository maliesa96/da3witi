import { Search, Circle, CheckCircle2, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Dashboard() {
  const t = useTranslations('Dashboard');

  return (
    <div className="max-w-6xl mx-auto px-6 pb-24 animate-fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
            {t('title')}
          </h1>
          <p className="text-stone-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
            {t('export_report')}
          </button>
          <button className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
            {t('send_update')}
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500 mb-1">
            {t('invited')}
          </div>
          <div className="text-2xl font-semibold text-stone-900">42</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
          <div className="text-xs font-medium text-stone-500 mb-1">
            {t('confirmed')}
          </div>
          <div className="text-2xl font-semibold text-stone-900">28</div>
          <div className="text-[10px] text-green-600 mt-1 font-medium">
            {t('confirmed_sub')}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500 mb-1">
            {t('declined')}
          </div>
          <div className="text-2xl font-semibold text-stone-900">4</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500 mb-1">
            {t('no_reply')}
          </div>
          <div className="text-2xl font-semibold text-stone-900">10</div>
        </div>
      </div>

      {/* Guest Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-medium text-stone-900">{t('guest_list')}</h3>
          <div className="relative">
            <span className="absolute right-3 top-2 text-stone-400 rtl:right-auto rtl:left-3">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="pr-8 pl-4 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-400 w-48 rtl:pr-4 rtl:pl-8"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-stone-50 text-xs text-stone-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-start">{t('col_name')}</th>
                <th className="px-6 py-3 text-start">{t('col_phone')}</th>
                <th className="px-6 py-3 text-start">{t('col_status')}</th>
                <th className="px-6 py-3 text-start">{t('col_qr')}</th>
                <th className="px-6 py-3 text-start"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
              {/* Row 1 */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">
                  عبدالله الأحمد
                </td>
                <td className="px-6 py-4 dir-ltr text-end text-stone-500">
                  +966 50 123 4567
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                    {t('status_present')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Circle size={12} />
                    <span className="text-xs">{t('qr_not_arrived')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-end">
                  <button className="text-stone-400 hover:text-stone-600">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">
                  خالد المنصور
                </td>
                <td className="px-6 py-4 dir-ltr text-end text-stone-500">
                  +966 55 987 6543
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                    {t('status_present')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-medium">
                      {t('qr_checked_in')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-end">
                  <button className="text-stone-400 hover:text-stone-600">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">
                  سعد الفهد
                </td>
                <td className="px-6 py-4 dir-ltr text-end text-stone-500">
                  +966 54 000 1111
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                    {t('status_declined')}
                  </span>
                </td>
                <td className="px-6 py-4 text-stone-300">-</td>
                <td className="px-6 py-4 text-end">
                  <button className="text-stone-400 hover:text-stone-600">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
