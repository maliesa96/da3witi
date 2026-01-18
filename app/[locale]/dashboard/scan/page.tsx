import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import QRScanner from "@/app/components/QRScanner";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ScanPage({
  searchParams
}: {
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ eventId?: string }>
}) {
  const { eventId } = await searchParams;
  const t = await getTranslations('Dashboard');

  // Verify auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  if (!eventId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <header className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1" />
            <span className="text-sm font-medium">{t('back_to_dashboard')}</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
              <Camera size={20} />
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
              {t('scan_qr')}
            </h1>
          </div>
        </header>

        <main>
          <QRScanner eventId={eventId as string} />
        </main>
      </div>
    </div>
  );
}

