import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Image from "next/image";
import { isRamadanPromoActive } from "@/lib/promo";

export default function RamadanBanner() {
  const t = useTranslations("HomePage");

  if (!isRamadanPromoActive) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden bg-[#EDE8F5] border-b border-purple-200/60"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 justify-center flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-purple-700 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full shrink-0">
          <Image src="/crescent.svg" alt="crescent moon" width={10} height={10} className="shrink-0 invert" />
          {t("ramadan_banner.highlight")}
        </span>
        <span className="text-xs sm:text-base font-medium text-purple-950">
          {t("ramadan_banner.message")}
        </span>
      </div>
    </motion.div>
  );
}
