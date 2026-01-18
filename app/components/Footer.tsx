import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

export function Footer() {
  const t = useTranslations('Footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center text-white">
            <Mail size={14} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-stone-900">
            Da3witi
          </span>
        </div>
        <div className="flex gap-6 text-sm text-stone-500 font-medium">
          <Link href="#" className="hover:text-stone-900">
            {t('about')}
          </Link>
          <Link href="#" className="hover:text-stone-900">
            {t('pricing')}
          </Link>
          <Link href="#" className="hover:text-stone-900">
            {t('contact')}
          </Link>
        </div>
        <div className="text-xs text-stone-400">
          {t('copyright', { year: currentYear })}
        </div>
      </div>
    </footer>
  );
}
