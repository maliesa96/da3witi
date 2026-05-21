"use client";

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const ACCENT = "#1c1917";
const ACCENT_DARK = "#0c0a09";
const CHAMPAGNE = "#c8b89a";
const CHAMPAGNE_DARK = "#8f8068";
const cabaWordmark = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
  display: "swap",
});

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 9999.1) * 43758.5453;
  return x - Math.floor(x);
}

export default function CabaLanding({
  locale,
}: {
  locale: string;
}) {
  const t = useTranslations("Auth");
  const isAr = locale === "ar";

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "966500000000";
  const waMsg = encodeURIComponent(
    isAr ? "مرحبًا، أرغب بمعرفة المزيد عن كابا" : "Hi, I'd like to learn more about Caba"
  );
  const waHref = `https://wa.me/${supportPhone}?text=${waMsg}`;

  return (
    <div className="flex flex-col min-h-dvh">
      <section className="relative flex-1 flex items-center overflow-hidden bg-linear-to-br from-white via-[#fbf9f4] to-[#f4eedf]">
        <BackgroundLayers />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: isAr ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:text-start space-y-7 order-2 lg:order-1"
            >
              <div className="flex justify-center lg:justify-start">
                <span
                  dir="ltr"
                  lang="en"
                  className={`${cabaWordmark.className} relative inline-flex items-center gap-3 text-7xl md:text-8xl lg:text-9xl leading-none tracking-[-0.08em]`}
                  style={{ color: ACCENT, textShadow: "0 10px 30px rgba(28, 25, 23, 0.12)" }}
                >
                  <span className="h-px w-8" style={{ backgroundColor: CHAMPAGNE }} aria-hidden />
                  <span>CABA</span>
                  <span className="h-px w-8" style={{ backgroundColor: CHAMPAGNE }} aria-hidden />
                </span>
              </div>

              <h1
                className={`tracking-tight font-display ${
                  isAr
                    ? "text-4xl md:text-5xl lg:text-[3.75rem] leading-[1.15] font-bold"
                    : "text-4xl md:text-5xl lg:text-6xl leading-[1.05] font-bold"
                }`}
              >
                {isAr ? (
                  <>
                    <span className="text-stone-900">ابعث دعواتك بأناقة </span>
                    <span style={{ color: CHAMPAGNE_DARK }}>تليق بمناسبتك</span>
                  </>
                ) : (
                  <>
                    <span className="text-stone-900">Send invitations with the elegance</span>{" "}
                    <span style={{ color: CHAMPAGNE_DARK }}>your event deserves</span>
                  </>
                )}
              </h1>

              <p
                className={`text-stone-700 text-base md:text-lg max-w-xl mx-auto lg:mx-0 ${
                  isAr ? "leading-loose" : "leading-relaxed"
                }`}
              >
                {isAr
                  ? "صمّم، أرسل، وتابع ضيوفك بكل سهولة عبر واتساب — تجربة دعوات راقية لحفلات الزفاف والمناسبات المميّزة."
                  : "Design, send, and track your guests effortlessly over WhatsApp — a refined invitation experience for weddings and special occasions."}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href={`/${locale}/login`}
                  className="group relative inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: `0 10px 25px -10px ${ACCENT}80`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = ACCENT_DARK;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = ACCENT;
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  />
                  <span className="relative">{t("login")}</span>
                  <ArrowRight
                    size={16}
                    className="relative transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  />
                </Link>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold text-stone-900 bg-white/80 border border-stone-300 hover:bg-white transition-all shadow-sm backdrop-blur-sm"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = ACCENT;
                    e.currentTarget.style.color = ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "";
                    e.currentTarget.style.color = "";
                  }}
                >
                  <MessageCircle size={16} />
                  <span>{isAr ? "تواصل معنا" : "Get in touch"}</span>
                </a>
              </div>

              <FeaturePills isAr={isAr} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="order-1 lg:order-2 flex justify-center"
            >
              <InvitationGallery isAr={isAr} />
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-stone-200/80 bg-[#faf8f3]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              dir="ltr"
              lang="en"
              className={`${cabaWordmark.className} tracking-[-0.06em] text-3xl leading-none`}
              style={{ color: ACCENT }}
            >
              CABA
            </span>

            <div className="flex items-center gap-2 text-stone-400">
              <span className="h-px w-8 bg-stone-300/60" />
              <span className="text-[10px] tracking-[0.3em] uppercase">
                {isAr ? "خدمة مقدمة من" : "Provided by"}
              </span>
              <span className="h-px w-8 bg-stone-300/60" />
            </div>

            <div className="space-y-1">
              <p dir="rtl" lang="ar" className="text-sm font-semibold text-stone-700">
                شركة بلاك لايت ودنق لتنظيم الحفلات والمناسبات الخاصة 
              </p>
              <p dir="ltr" lang="en" className="text-sm text-stone-500">
                Black Light Wedding Company for Events &amp; Special Occasions
              </p>
            </div>

            <p className="mt-1 text-xs text-stone-400">
              © {new Date().getFullYear()} Caba
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

const SPARKLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  top: r2(pseudoRandom(i + 1) * 100),
  left: r2(pseudoRandom(i + 1.7) * 100),
  delay: r2(pseudoRandom(i + 2.3) * 5),
  duration: r2(4 + pseudoRandom(i + 3.1) * 4),
  size: Math.round(4 + pseudoRandom(i + 4.9) * 5),
  hue: [CHAMPAGNE, ACCENT, "#efe4d1"][i % 3],
}));

function BackgroundLayers() {
  const reduceMotion = useReducedMotion();

  const geometricPattern =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' fill='none' stroke='%23${CHAMPAGNE.slice(1)}' stroke-width='0.6' opacity='0.9'>
        <path d='M40 4 L52 16 L68 16 L68 32 L80 40 L68 48 L68 64 L52 64 L40 76 L28 64 L12 64 L12 48 L0 40 L12 32 L12 16 L28 16 Z'/>
        <path d='M40 16 L56 28 L56 44 L40 56 L24 44 L24 28 Z'/>
        <circle cx='40' cy='40' r='6'/>
      </svg>`
    );

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("${geometricPattern}")`,
          backgroundSize: "120px 120px",
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-160 h-160 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(200,184,154,0.20), rgba(200,184,154,0) 70%)",
        }}
        animate={reduceMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 w-xl h-144 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(28,25,23,0.06), rgba(28,25,23,0) 70%)",
        }}
      />

      {!reduceMotion &&
        SPARKLES.map((s) => (
          <motion.div
            key={s.id}
            aria-hidden
            className="pointer-events-none absolute"
            style={{ top: `${s.top}%`, left: `${s.left}%` }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.4, 1.1, 0.4],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill={s.hue}>
              <path d="M12 0 L13.6 9.4 L23 11 L13.6 12.6 L12 22 L10.4 12.6 L1 11 L10.4 9.4 Z" />
            </svg>
          </motion.div>
        ))}
    </>
  );
}

function InvitationGallery({ isAr }: { isAr: boolean }) {
  const reduceMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [releasingKey, setReleasingKey] = useState<string | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fanEase = [0.22, 1, 0.36, 1] as const;
  const HOVER_DURATION_MS = 450;

  const fans = [
    {
      key: "floral",
      node: <FloralCard isAr={isAr} />,
      target: { rotate: -8, x: "-16%", y: "7%", scale: 0.78 },
      delay: 0.45,
      z: 1,
    },
    {
      key: "modern",
      node: <ModernCard isAr={isAr} />,
      target: { rotate: 8, x: "16%", y: "7%", scale: 0.78 },
      delay: 0.55,
      z: 2,
    },
    {
      key: "classic",
      node: <ClassicCard isAr={isAr} />,
      target: { rotate: 0, x: "0%", y: "0%", scale: 1 },
      delay: 0.7,
      z: 3,
    },
  ];

  const handleHoverStart = (key: string) => {
    if (releaseTimer.current) {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
    setReleasingKey(null);
    setHoveredKey(key);
  };

  const handleHoverEnd = (key: string) => {
    setHoveredKey((prev) => (prev === key ? null : prev));
    setReleasingKey(key);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      setReleasingKey((prev) => (prev === key ? null : prev));
      releaseTimer.current = null;
    }, HOVER_DURATION_MS);
  };

  const isElevated = (key: string) =>
    hoveredKey === key || releasingKey === key;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-4/5">
        <motion.div
          aria-hidden
          className="absolute -inset-12 rounded-[3rem]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(200,184,154,0.34), rgba(200,184,154,0) 70%)",
          }}
          animate={
            reduceMotion ? undefined : { scale: [1, 1.04, 1], opacity: [0.55, 0.8, 0.55] }
          }
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-full w-full"
          style={{ perspective: "1200px" }}
        >
          {fans.map((f) => {
            const elevated = isElevated(f.key);
            return (
              <motion.div
                key={f.key}
                className="absolute inset-0 origin-center cursor-pointer"
                style={{
                  zIndex: elevated ? 20 : f.z,
                  transformOrigin: "50% 60%",
                }}
                onHoverStart={() => handleHoverStart(f.key)}
                onHoverEnd={() => handleHoverEnd(f.key)}
                initial={{
                  opacity: 0,
                  rotate: 0,
                  x: "0%",
                  y: "0%",
                  scale: 0.92,
                }}
                animate={
                  reduceMotion
                    ? {
                        opacity: 1,
                        rotate: 0,
                        x: "0%",
                        y: "0%",
                        scale: f.target.scale,
                      }
                    : { opacity: 1, ...f.target }
                }
                whileHover={
                  reduceMotion
                    ? undefined
                    : {
                        rotate: f.target.rotate * 0.4,
                        scale: f.target.scale * 1.18,
                        y: `calc(${f.target.y} - 4%)`,
                        transition: {
                          duration: HOVER_DURATION_MS / 1000,
                          ease: fanEase,
                        },
                      }
                }
                transition={{
                  duration: elevated ? HOVER_DURATION_MS / 1000 : 0.95,
                  delay: elevated ? 0 : f.delay,
                  ease: fanEase,
                }}
              >
                {f.node}
              </motion.div>
            );
          })}
        </motion.div>

        <FloatingChip
          className="absolute -top-4 -left-6 md:-left-10 z-20"
          delay={1.1}
          floatDelay={0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366">
            <path d="M20.52 3.48A11.88 11.88 0 0 0 12.06 0C5.5 0 .15 5.34.15 11.91c0 2.1.55 4.16 1.6 5.97L.05 24l6.27-1.65a11.86 11.86 0 0 0 5.74 1.46h.01c6.56 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.46-8.42zM12.07 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.62-.23-.37a9.83 9.83 0 0 1-1.5-5.27c0-5.46 4.45-9.9 9.91-9.9 2.65 0 5.13 1.03 7 2.9a9.86 9.86 0 0 1 2.91 7c0 5.45-4.46 9.87-9.95 9.87z" />
          </svg>
          <div className="text-left rtl:text-right">
            <div className="text-[9px] tracking-widest text-stone-500">
              {isAr ? "أرسل عبر" : "SENT VIA"}
            </div>
            <div className="text-xs font-semibold text-stone-900">WhatsApp</div>
          </div>
        </FloatingChip>

        <FloatingChip
          className="absolute -bottom-4 -right-6 md:-right-10 z-20"
          delay={1.25}
          floatDelay={1.5}
        >
          <div
            className="grid place-items-center w-7 h-7 rounded-md text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: ACCENT }}
          >
            ✓
          </div>
          <div className="text-left rtl:text-right">
            <div className="text-[9px] tracking-widest text-stone-500">
              {isAr ? "تأكيد الحضور" : "CONFIRMED"}
            </div>
            <div className="text-xs font-semibold text-stone-900">128 / 200</div>
          </div>
        </FloatingChip>
      </div>
    </div>
  );
}

function CardShell({
  children,
  background,
  innerBorder,
}: {
  children: React.ReactNode;
  background: string;
  innerBorder?: string;
}) {
  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden
        className="absolute -inset-px rounded-4xl opacity-70"
        style={{
          background:
            "linear-gradient(135deg, #eee3d0 0%, #c8b89a 50%, #f6efe3 100%)",
        }}
      />
      <div
        className="relative h-full w-full rounded-4xl overflow-hidden shadow-2xl shadow-stone-900/20"
        style={{ background }}
      >
        {innerBorder && (
          <>
            <div
              className="absolute inset-3 rounded-[1.7rem] border"
              style={{ borderColor: innerBorder }}
            />
            <div
              className="absolute inset-5 rounded-[1.4rem] border"
              style={{ borderColor: innerBorder, opacity: 0.5 }}
            />
          </>
        )}
        {children}
      </div>
    </div>
  );
}

function ClassicCard({ isAr }: { isAr: boolean }) {
  return (
    <CardShell
      background="linear-gradient(160deg, #faf6ef 0%, #f0e6d2 50%, #e3d3b3 100%)"
      innerBorder="rgba(41,37,36,0.2)"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(200,184,154,0.28), transparent 40%), radial-gradient(circle at 80% 80%, rgba(28,25,23,0.08), transparent 40%)",
        }}
      />

      <CornerOrnament position="top-3 left-3" rotate={0} />
      <CornerOrnament position="top-3 right-3" rotate={90} />
      <CornerOrnament position="bottom-3 left-3" rotate={270} />
      <CornerOrnament position="bottom-3 right-3" rotate={180} />

      <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
        <CenterMedallion />

        <p className="mt-5 text-stone-600 text-[10px] md:text-xs tracking-[0.5em] uppercase">
          {isAr ? "بطاقة دعوة" : "Invitation"}
        </p>

        <h3
          className="mt-3 text-3xl md:text-4xl font-display text-stone-900 leading-tight"
          dir="rtl"
        >
          أحمد <span style={{ color: CHAMPAGNE_DARK }} className="mx-1">❋</span> نورة
        </h3>

        <div className="mt-4 mb-3 flex items-center gap-2 text-stone-500">
          <span className="h-px w-10 bg-stone-400/60" />
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
          <span className="h-px w-10 bg-stone-400/60" />
        </div>

        <p className="text-stone-700 text-xs leading-loose max-w-[16rem]" dir="rtl">
          يتشرفون بدعوتكم لحضور حفل زفافهم
        </p>

        <p
          className="mt-3 text-stone-900 font-display text-base md:text-lg"
          dir="rtl"
        >
          السبت ١٥ ربيع الآخر
        </p>

        <div
          className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] tracking-[0.3em] text-white uppercase"
          style={{ backgroundColor: ACCENT }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: CHAMPAGNE }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CHAMPAGNE }}
            />
          </span>
          RSVP
        </div>
      </div>
    </CardShell>
  );
}

function ModernCard({ isAr }: { isAr: boolean }) {
  return (
    <CardShell
      background="linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%)"
    >
      <div className="relative h-full flex flex-col px-10 py-10">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1" style={{ backgroundColor: CHAMPAGNE, opacity: 0.85 }} />
          <span
            className="text-[9px] tracking-[0.5em] uppercase"
            style={{ color: CHAMPAGNE_DARK }}
          >
            {isAr ? "دعوة زفاف" : "Wedding"}
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: CHAMPAGNE, opacity: 0.85 }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[10px] tracking-[0.3em] text-stone-400 uppercase">
              {isAr ? "بحفاوة" : "With joy"}
            </span>
          </div>

          <h3
            className="font-serif text-stone-900 leading-[1.1]"
            dir={isAr ? "rtl" : "ltr"}
            style={{ fontSize: "2.5rem" }}
          >
            {isAr ? (
              <>
                أحمد
                <div className="my-2 flex items-center justify-center gap-3 text-stone-400">
                  <span className="h-px w-6 bg-stone-300" />
                  <span
                    className="text-[10px] tracking-[0.4em] uppercase"
                    style={{ color: CHAMPAGNE_DARK }}
                  >
                    &
                  </span>
                  <span className="h-px w-6 bg-stone-300" />
                </div>
                نورة
              </>
            ) : (
              <>
                Ahmed
                <div className="my-2 flex items-center justify-center gap-3 text-stone-400">
                  <span className="h-px w-6 bg-stone-300" />
                  <span
                    className="text-[10px] tracking-[0.4em] uppercase"
                    style={{ color: CHAMPAGNE_DARK }}
                  >
                    &
                  </span>
                  <span className="h-px w-6 bg-stone-300" />
                </div>
                Noura
              </>
            )}
          </h3>

          <p
            className="mt-8 text-stone-500 text-[11px] tracking-[0.3em] uppercase"
            dir="ltr"
          >
            {isAr ? "السبت · ١٥ ربيع الآخر" : "Saturday · 15 Rabi II"}
          </p>
          <p className="mt-1 text-stone-400 text-[11px] tracking-[0.3em] uppercase">
            Riyadh
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-[9px] tracking-[0.3em] uppercase"
            style={{ color: CHAMPAGNE_DARK }}
          >
            RSVP
          </span>
          <div
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
        </div>
      </div>
    </CardShell>
  );
}

function FloralCard({ isAr }: { isAr: boolean }) {
  return (
    <CardShell
      background="linear-gradient(170deg, #fff8f1 0%, #fdeee0 60%, #f6e0d3 100%)"
    >
      <svg
        aria-hidden
        className="absolute -top-4 -left-2 w-32 h-32 opacity-80"
        viewBox="0 0 120 120"
        fill="none"
      >
        <path
          d="M30 90 Q 28 70 38 56 Q 48 42 64 36 Q 80 30 96 22"
          stroke={CHAMPAGNE_DARK}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.9"
        />
        <ellipse cx="42" cy="58" rx="6" ry="9" transform="rotate(-30 42 58)" fill="#e8a8a8" opacity="0.85" />
        <ellipse cx="56" cy="44" rx="5" ry="8" transform="rotate(-20 56 44)" fill="#d68888" opacity="0.85" />
        <ellipse cx="74" cy="34" rx="5" ry="7" transform="rotate(-10 74 34)" fill="#e8a8a8" opacity="0.85" />
        <circle cx="44" cy="74" r="3" fill={CHAMPAGNE_DARK} opacity="0.7" />
        <circle cx="62" cy="62" r="2.5" fill={CHAMPAGNE_DARK} opacity="0.7" />
        <circle cx="84" cy="46" r="2" fill={CHAMPAGNE_DARK} opacity="0.7" />
      </svg>

      <svg
        aria-hidden
        className="absolute -bottom-2 -right-2 w-32 h-32 opacity-80"
        viewBox="0 0 120 120"
        fill="none"
        style={{ transform: "rotate(180deg)" }}
      >
        <path
          d="M30 90 Q 28 70 38 56 Q 48 42 64 36 Q 80 30 96 22"
          stroke={CHAMPAGNE_DARK}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.9"
        />
        <ellipse cx="42" cy="58" rx="6" ry="9" transform="rotate(-30 42 58)" fill="#e8a8a8" opacity="0.85" />
        <ellipse cx="56" cy="44" rx="5" ry="8" transform="rotate(-20 56 44)" fill="#d68888" opacity="0.85" />
        <ellipse cx="74" cy="34" rx="5" ry="7" transform="rotate(-10 74 34)" fill="#e8a8a8" opacity="0.85" />
      </svg>

      <div className="relative h-full flex flex-col items-center justify-center px-10 text-center">
        <p className="text-[10px] tracking-[0.5em] uppercase" style={{ color: CHAMPAGNE_DARK }}>
          {isAr ? "بطاقة دعوة" : "You're invited"}
        </p>

        <h3
          className="mt-4 font-serif text-stone-900 leading-tight"
          style={{ fontSize: "2.25rem" }}
          dir="rtl"
        >
          أحمد
          <span
            className="mx-3 align-middle inline-block"
            style={{ color: CHAMPAGNE_DARK, fontFamily: "serif", fontStyle: "italic" }}
          >
            &amp;
          </span>
          نورة
        </h3>

        <div className="mt-5 mb-3 flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill={CHAMPAGNE_DARK} opacity="0.8">
            <path d="M7 1 C 9 4 11 5 13 7 C 11 9 9 10 7 13 C 5 10 3 9 1 7 C 3 5 5 4 7 1 Z" />
          </svg>
        </div>

        <p className="text-stone-700 text-xs leading-loose max-w-56" dir="rtl">
          يتشرفون بدعوتكم لمشاركتهم فرحتهم
        </p>

        <p
          className="mt-3 font-serif text-base md:text-lg"
          style={{ color: ACCENT_DARK }}
          dir="rtl"
        >
          السبت ١٥ ربيع الآخر
        </p>
      </div>
    </CardShell>
  );
}

function FloatingChip({
  className,
  children,
  delay = 0,
  floatDelay = 0,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
  floatDelay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay,
        }}
        className="flex items-center gap-2 rounded-2xl bg-white/90 backdrop-blur-md border border-stone-200 px-3 py-2 shadow-xl shadow-stone-900/10"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CornerOrnament({
  position,
  rotate,
}: {
  position: string;
  rotate: number;
}) {
  return (
    <div className={`absolute ${position}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <path
          d="M2 2 L20 2 M2 2 L2 20 M2 2 Q 14 8 14 14 Q 14 8 20 2 M2 2 Q 8 14 14 14 Q 8 14 2 20"
          stroke="url(#cornerGrad)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="14" cy="14" r="1.5" fill={CHAMPAGNE_DARK} />
        <defs>
          <linearGradient id="cornerGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CHAMPAGNE_DARK} />
            <stop offset="100%" stopColor={CHAMPAGNE} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function CenterMedallion() {
  return (
    <svg width="92" height="92" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="medGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CHAMPAGNE} />
          <stop offset="50%" stopColor={CHAMPAGNE_DARK} />
          <stop offset="100%" stopColor={ACCENT} />
        </linearGradient>
        <radialGradient id="medFill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(200,184,154,0.34)" />
          <stop offset="100%" stopColor="rgba(200,184,154,0)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#medFill)" />
      <path
        d="M50 6 L58 25 L78 22 L72 41 L92 50 L72 59 L78 78 L58 75 L50 94 L42 75 L22 78 L28 59 L8 50 L28 41 L22 22 L42 25 Z"
        stroke="url(#medGrad)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M50 18 L56 32 L70 30 L66 44 L80 50 L66 56 L70 70 L56 68 L50 82 L44 68 L30 70 L34 56 L20 50 L34 44 L30 30 L44 32 Z"
        stroke="url(#medGrad)"
        strokeWidth="0.8"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle cx="50" cy="50" r="6" fill="url(#medGrad)" />
      <circle cx="50" cy="50" r="2.5" fill="#faf6ef" />
    </svg>
  );
}

function FeaturePills({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? ["تصميم راقٍ", "إرسال عبر واتساب", "تتبع الحضور", "بطاقات QR"]
    : ["Elegant designs", "WhatsApp delivery", "Live RSVPs", "QR tickets"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2"
    >
      {items.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/70 bg-white/70 px-3 py-1.5 text-xs text-stone-700 backdrop-blur-sm"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: CHAMPAGNE_DARK }}
          />
          {label}
        </span>
      ))}
    </motion.div>
  );
}
