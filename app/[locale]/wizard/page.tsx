"use client";

import { useState } from "react";
import {
  ArrowRight,
  UploadCloud,
  ArrowLeft,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
} from "lucide-react";

import InvitePreview from "../../components/InvitePreview";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const MapPicker = dynamic(() => import("../../components/MapPicker"), {
  ssr: false,
  loading: () => {
     // eslint-disable-next-line react-hooks/rules-of-hooks
     const t = useTranslations('Common');
     return (
        <div className="h-full w-full bg-stone-100 flex items-center justify-center text-xs text-stone-500">
        {t('loading_map')}
        </div>
    )
  },
});

export default function Wizard() {
  const t = useTranslations('Wizard');
  const [step, setStep] = useState(1);
  const [mapMode, setMapMode] = useState<"link" | "map">("link");
  const [details, setDetails] = useState({
    date: "",
    time: "",
    location: "",
    message: "يسرنا دعوتكم لحضور حفل زفاف ابننا محمد، وذلك يوم الجمعة القادم. حضوركم يشرفنا.", // This should probably be empty or default translated?
    qrEnabled: true,
    imageUrl: ""
  });
  
  // Update default message based on locale? Or just leave it user input.
  // Ideally, default message should be localized if empty. 
  
  const [inviteMode, setInviteMode] = useState<"file" | "manual">("file");
  const [manualInvites, setManualInvites] = useState([{ name: "", phone: "" }]);

  const addManualInvite = () => {
    setManualInvites([...manualInvites, { name: "", phone: "" }]);
  };

  const updateManualInvite = (index: number, field: "name" | "phone", value: string) => {
    const newInvites = [...manualInvites];
    newInvites[index][field] = value;
    setManualInvites(newInvites);
  };

  const removeManualInvite = (index: number) => {
    if (manualInvites.length > 1) {
      setManualInvites(manualInvites.filter((_, i) => i !== index));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setDetails(prev => ({ ...prev, imageUrl: url }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24">
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-stone-200 -z-10"></div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-stone-50 px-2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => setStep(i)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step
                  ? "bg-stone-900 text-white"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {i}
            </div>
            <span
              className={`text-[10px] font-medium ${
                i <= step ? "text-stone-900" : "text-stone-500"
              }`}
            >
              {i === 1
                ? t('steps.account')
                : i === 2
                ? t('steps.guests')
                : i === 3
                ? t('steps.details')
                : t('steps.preview')}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: EMAIL / AUTH */}
      {step === 1 && (
        <div className="animate-slide-up max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step1.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step1.desc')}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                {t('step1.email_label')}
              </label>
              <input
                type="email"
                placeholder={t('step1.email_placeholder')}
                className="w-full px-4 py-3 rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all text-sm text-left dir-ltr"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-stone-900 text-white py-3 rounded-lg font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
            >
              <span>{t('step1.continue')}</span>
              <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INVITE LIST */}
      {step === 2 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step2.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step2.desc')}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b border-stone-100">
              <button
                onClick={() => setInviteMode("file")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  inviteMode === "file"
                    ? "text-stone-900 border-b-2 border-stone-900 bg-stone-50"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t('step2.tab_file')}
              </button>
              <button
                onClick={() => setInviteMode("manual")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  inviteMode === "manual"
                    ? "text-stone-900 border-b-2 border-stone-900 bg-stone-50"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t('step2.tab_manual')}
              </button>
            </div>

            <div className="p-8">
              {inviteMode === "file" ? (
                <>
                  {/* File Upload UI */}
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center hover:bg-stone-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud size={24} className="text-stone-400" />
                    </div>
                    <p className="text-sm font-medium text-stone-900">
                      {t('step2.upload_text')}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {t('step2.upload_sub')}
                    </p>
                  </div>

                  {/* Column Mapping Simulation */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-stone-900">
                        {t('step2.match_columns')}
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3 h-3 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                        />
                        <span className="text-xs text-stone-500">
                          {t('step2.ignore_header')}
                        </span>
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                          {t('step2.column_a')} (مثال: 9665000000)
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowLeft size={14} className="text-stone-400 rtl:rotate-180" />
                          <select className="w-full bg-white border border-stone-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-stone-400">
                            <option>{t('step2.manual_phone')}</option>
                            <option>{t('step2.manual_name')}</option>
                            <option>تجاهل</option>
                          </select>
                        </div>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                          {t('step2.column_b')} (مثال: عبدالله أحمد)
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowLeft size={14} className="text-stone-400 rtl:rotate-180" />
                          <select className="w-full bg-white border border-stone-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-stone-400">
                            <option>{t('step2.manual_name')}</option>
                            <option>{t('step2.manual_phone')}</option>
                            <option>تجاهل</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in">
                  <div className="space-y-4">
                    {manualInvites.map((invite, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-stone-700 mb-1.5">
                            {t('step2.manual_name')}
                          </label>
                          <input
                            type="text"
                            value={invite.name}
                            onChange={(e) => updateManualInvite(index, "name", e.target.value)}
                            placeholder={t('step2.manual_name')}
                            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-stone-700 mb-1.5">
                            {t('step2.manual_phone')}
                          </label>
                          <input
                            type="tel"
                            value={invite.phone}
                            onChange={(e) => updateManualInvite(index, "phone", e.target.value)}
                            placeholder="05xxxxxxxx"
                            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none transition-all text-sm dir-ltr text-right"
                          />
                        </div>
                        {manualInvites.length > 1 && (
                          <button
                            onClick={() => removeManualInvite(index)}
                            className="mt-7 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addManualInvite}
                    className="mt-6 w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Plus size={18} />
                    <span>{t('step2.add_guest')}</span>
                  </button>
                </div>
              )}
            </div>
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-between items-center">
              <span className="text-xs text-stone-500">
                {inviteMode === "file" 
                  ? t('step2.detected_contacts', {count: 42})
                  : t('step2.added_contacts', {count: manualInvites.filter(i => i.name || i.phone).length})}
              </span>
              <button
                onClick={() => setStep(3)}
                className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all"
              >
                {t('step2.next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: OPTIONS */}
      {step === 3 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step3.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step3.desc')}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12">
            {/* Main Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Image Upload */}
              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="text-sm font-medium text-stone-900">
                  {t('step3.image_upload')}
                </h3>
                <label className="border-2 border-dashed border-stone-200 rounded-lg p-6 text-center hover:bg-stone-50 transition-colors cursor-pointer group block">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud size={20} className="text-stone-400" />
                  </div>
                  <p className="text-xs font-medium text-stone-900">
                    {t('step3.click_upload')}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1">
                    JPG, PNG (Max 2MB)
                  </p>
                </label>
              </div>

              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    {t('step3.message_label')}
                  </label>
                  <textarea
                    rows={4}
                    value={details.message}
                    onChange={(e) => setDetails({ ...details, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:bg-white focus:border-stone-400 outline-none transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      {t('step3.date_label')}
                    </label>
                    <input
                      type="date"
                      value={details.date}
                      onChange={(e) => setDetails({ ...details, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none text-stone-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      {t('step3.time_label')}
                    </label>
                    <input
                      type="time"
                      value={details.time}
                      onChange={(e) => setDetails({ ...details, time: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none text-stone-600"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      {t('step3.location_label')}
                    </label>
                    <div className="flex bg-stone-100 rounded-md p-0.5">
                      <button
                        onClick={() => setMapMode("link")}
                        className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                          mapMode === "link"
                            ? "bg-white text-stone-900 shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                        }`}
                      >
                        {t('step3.link_btn')}
                      </button>
                      <button
                        onClick={() => setMapMode("map")}
                        className={`text-[10px] px-2 py-0.5 rounded-sm transition-all ${
                          mapMode === "map"
                            ? "bg-white text-stone-900 shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                        }`}
                      >
                        {t('step3.map_btn')}
                      </button>
                    </div>
                  </div>

                  {mapMode === "link" ? (
                    <div className="relative">
                      <span className="absolute right-3 top-2.5 text-stone-400">
                        <MapPin size={16} />
                      </span>
                      <input
                        type="url"
                        value={details.location}
                        onChange={(e) => setDetails({ ...details, location: e.target.value })}
                        placeholder="https://maps.google.com/..."
                        className="w-full pr-9 pl-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:bg-white focus:border-stone-400 transition-all dir-ltr"
                      />
                    </div>
                  ) : (
                    <div className="relative h-64 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden group">
                      <MapPicker
                        onLocationSelect={(lat: number, lng: number) => {
                          setDetails({ ...details, location: `${lat}, ${lng}` });
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                {/* Toggle Item */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {t('step3.qr_toggle')}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {t('step3.qr_desc')}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={details.qrEnabled}
                      onChange={(e) => setDetails({ ...details, qrEnabled: e.target.checked })}
                      className="sr-only peer custom-checkbox"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                  </label>
                </div>
                <hr className="border-stone-100" />
                {/* Toggle Item */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {t('step3.reminder_toggle')}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {t('step3.reminder_desc')}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer custom-checkbox"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900 rtl:peer-checked:after:-translate-x-full"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="bg-stone-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all shadow-sm"
                >
                  {t('step3.preview_send')}
                </button>
              </div>
            </div>

            {/* Sidebar Info - Replaced with Live Preview */}
            <div className="hidden lg:block lg:col-span-2 sticky top-24 h-fit">
               <div className="scale-90 xl:scale-100 origin-top flex justify-center">
                 <InvitePreview 
                    date={details.date}
                    location={details.location}
                    message={details.message}
                    imageUrl={details.imageUrl}
                    showQr={details.qrEnabled}
                 />
               </div>
               <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4 text-center">
                  {t('step3.live_preview')}
               </h4>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & PAY */}
      {step === 4 && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('step4.title')}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">
              {t('step4.desc')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Phone Preview */}
            <InvitePreview
              date={details.date}
              location={details.location}
              message={details.message}
              imageUrl={details.imageUrl}
              showQr={details.qrEnabled}
            />

            {/* Checkout Box */}
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-lg mt-8 lg:mt-0">
              <h3 className="text-lg font-semibold text-stone-900 mb-6">
                {t('step4.order_summary')}
              </h3>

              <div className="space-y-4 mb-8 border-b border-stone-100 pb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step4.count_invites')}</span>
                  <span className="font-medium text-stone-900">42</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step4.service_qr')}</span>
                  <span className="font-medium text-stone-900">{t('step4.active')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">{t('step4.service_reminder')}</span>
                  <span className="font-medium text-stone-900">{t('step4.active')}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-semibold pt-2">
                  <span className="text-stone-900">{t('step4.total')}</span>
                  <span className="text-stone-900">84.00 ر.س</span>
                </div>
              </div>

              <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium text-sm hover:bg-stone-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 group">
                <span>{t('step4.pay_send')}</span>
                <CreditCard
                  size={16}
                  className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1"
                />
              </button>

              <p className="text-[10px] text-stone-400 text-center mt-4">
                {t('step4.terms')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
