import Link from "next/link";
import {
  Sparkles,
  PlayCircle,
  ArrowRight,
  Building2,
  Plus,
  Mic,
  Users,
  QrCode,
  MessageCircle,
} from "lucide-react";
import ScrollToIdButton from "./components/ScrollToIdButton";

export default function Home() {
  return (
    <div className="animate-fade-in block">
      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Hero */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 py-16 lg:py-24">
          <div className="flex-1 space-y-8 relative z-10 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              نظام الدعوات الآلي الأول في الخليج
            </div>
            <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-stone-900">
              دعوات فاخرة،<br />
              تصلهم بلمسة زر.
            </h1>
            <p className="text-lg text-stone-500 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
              منشئ دعوات ذكي للمناسبات الراقية والأفراح. قم برفع قائمة المدعوين،
              صمم بطاقتك، ودعنا نتولى إرسالها وتتبع الحضور عبر واتساب بشكل آلي
              بالكامل.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link
                href="/wizard"
                prefetch={false}
                className="bg-stone-900 text-stone-50 px-8 py-3.5 rounded-xl font-medium shadow-lg shadow-stone-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>أنشئ دعوة جديدة</span>
                <Sparkles size={18} />
              </Link>
              <ScrollToIdButton
                targetId="phone-preview"
                className="bg-white border border-stone-200 text-stone-700 px-8 py-3.5 rounded-xl font-medium hover:bg-stone-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>شاهد مثال</span>
                <PlayCircle size={18} />
              </ScrollToIdButton>
            </div>
          </div>

          {/* Visual/Phone Mockup */}
          <div
            id="phone-preview"
            className="flex-1 w-full max-w-[400px] lg:max-w-none flex justify-center perspective-1000"
          >
            <div className="relative w-[300px] h-[600px] bg-stone-900 rounded-[3rem] border-8 border-stone-900 shadow-2xl overflow-hidden transform rotate-y-12 transition-transform duration-700 hover:rotate-0">
              {/* Dynamic Island */}
              <div className="absolute top-0 inset-x-0 h-6 bg-stone-900 z-20 flex justify-center">
                <div className="w-24 h-5 bg-black rounded-b-xl"></div>
              </div>
              {/* Screen Content */}
              <div className="w-full h-full bg-[#E5DDD5] relative overflow-hidden flex flex-col whatsapp-bg">
                <div className="bg-[#008069] h-20 flex items-end pb-3 px-4 text-white shadow-sm shrink-0 z-10">
                  <div className="flex items-center gap-3 w-full">
                    <ArrowRight size={20} />
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        دعـوتـي 
                    </div>
                      <div className="text-[10px] opacity-80">حساب تجاري</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-4">
                  <div className="flex justify-center my-4">
                    <span className="bg-[#FFF4D6] text-stone-600 text-[10px] px-2 py-1 rounded shadow-sm">
                      اليوم
                    </span>
                  </div>
                  {/* Message Bubble */}
                  <div
                    className="bg-white rounded-lg rounded-tr-none p-1 shadow-sm max-w-[90%] self-start animate-slide-up"
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="bg-stone-100 rounded-md h-32 w-full mb-1 flex items-center justify-center overflow-hidden relative">
                      <img
                        src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg"
                        className="w-full h-full object-cover opacity-90"
                        alt="Wedding"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="text-white font-serif text-2xl">
                          أفراح آل محمد
                        </span>
                      </div>
                    </div>
                    <div className="p-2 pb-1">
                      <p className="text-xs font-bold text-stone-800 mb-1">
                        دعوة خاصة
                      </p>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        يسرنا دعوتكم لحضور حفل زفاف ابننا محمد، وذلك يوم الجمعة
                        القادم. حضوركم يشرفنا.
                      </p>
                      <div className="mt-2 pt-2 border-t border-dashed border-stone-200 flex justify-between items-center">
                        <button
                          type="button"
                          className="text-[#007bfc] text-[11px] font-medium cursor-pointer"
                        >
                          تأكيد الحضور
                        </button>
                        <span className="text-[9px] text-stone-400">
                          04:30 م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-14 bg-[#f0f2f5] px-2 flex items-center gap-2 shrink-0">
                  <Plus size={24} className="text-stone-400" />
                  <div className="flex-1 bg-white h-9 rounded-full px-3 flex items-center text-xs text-stone-400">
                    اكتب رسالة...
                  </div>
                  <Mic size={24} className="text-stone-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 py-16 border-t border-stone-200/60">
          <div className="p-6 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center mb-4 text-stone-700">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              إدارة المدعوين بسهولة
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              استيراد القوائم من ملفات Excel، وتصنيف الضيوف، ومتابعة الردود لحظة
              بلحظة.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center mb-4 text-stone-700">
              <QrCode size={20} />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              تذاكر QR ذكية
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              إرسال كود QR خاص لكل ضيف لتسهيل عملية الدخول وتنظيم الاستقبال.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center mb-4 text-stone-700">
              <MessageCircle size={20} />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              أتمتة الواتساب
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              رسائل تذكير قبل الموعد، خرائط الموقع، ورسائل شكر بعد الحضور، كل
              ذلك آلياً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
