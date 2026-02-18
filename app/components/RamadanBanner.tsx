"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Image from "next/image";
import { isRamadanPromoActive } from "@/lib/promo";

export default function RamadanBanner() {
  const t = useTranslations("HomePage");
  const [visible, setVisible] = useState(isRamadanPromoActive);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden bg-[#EDE8F5] border-b border-purple-200/60"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 sm:gap-4 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center text-center">
          <span className="inline-flex items-center gap-1.5 bg-purple-700 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            <Image src="/crescent.svg" alt="crescent moon" width={10} height={10} className="shrink-0 invert" />
            {t("ramadan_banner.highlight")}
          </span>
          <span className="text-sm sm:text-base font-medium text-purple-950">
            {t("ramadan_banner.message")}
          </span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="absolute top-1/2 -translate-y-1/2 end-3 sm:end-4 text-purple-300 hover:text-purple-700 transition-colors p-1 cursor-pointer"
          aria-label="Close banner"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1 1 13" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
