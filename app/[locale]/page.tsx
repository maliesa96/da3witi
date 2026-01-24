"use client";

import { Link } from "@/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Palette,
  Zap,
  Users,
  Send,
  Check,
  QrCode
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import InvitePreview from "../components/InvitePreview";
import LiveDashboardDemo from "../components/LiveDashboardDemo";
import StorySlider from "../components/StorySlider";
import { motion } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const t = useTranslations('HomePage');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  
  const containerRef = useRef(null);
  
  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-900 font-sans selection:bg-purple-100 selection:text-purple-900 overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 px-6 overflow-hidden">
        {/* Abstract SVG Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none"
        >
          <svg
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover opacity-100 scale-105"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Soft Purple Swirl */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              d="M1264.47 54.3468C1340.42 -42.8229 1438.35 -97.234 1532.74 -103.886L1763.58 630.985C1665.48 680.122 1545.92 688.136 1426.4 675.292C1181.56 649.03 1032.55 425.86 1121.18 221.751C1155.63 142.339 1213.9 98.7188 1264.47 54.3468Z"
              fill="url(#paint0_linear_swirl)"
            />
            {/* Large Yellow/Amber Abstract Blob */}
            <motion.path
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
              d="M-282 300C-282 300 350 -100 680 -50C1010 0 950 400 950 400C950 400 600 750 -100 850L-282 300Z"
              fill="url(#paint1_linear_swirl)"
            />
            {/* Floating Soft Blue Shape */}
            <motion.path 
              animate={{ 
                d: [
                  "M100 100 Q 250 50 400 150 T 700 300 T 1000 200",
                  "M100 120 Q 250 80 400 180 T 700 320 T 1000 220",
                  "M100 100 Q 250 50 400 150 T 700 300 T 1000 200"
                ] 
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              stroke="url(#paint2_linear_swirl)"
              strokeWidth="120"
              strokeLinecap="round"
              fill="none"
              className="opacity-40 blur-2xl"
            />
            
            <defs>
              <linearGradient
                id="paint0_linear_swirl"
                x1="1200"
                y1="0"
                x2="1600"
                y2="600"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F3E8FF" stopOpacity="0.8" />
                <stop offset="1" stopColor="#E0E7FF" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="paint1_linear_swirl"
                x1="0"
                y1="0"
                x2="800"
                y2="800"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#FEF3C7" stopOpacity="0.6" />
                <stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
              </linearGradient>
               <linearGradient
                id="paint2_linear_swirl"
                x1="100"
                y1="100"
                x2="1000"
                y2="200"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E0F2FE" />
                <stop offset="1" stopColor="#BAE6FD" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="space-y-8 z-10 relative min-w-0">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-100 shadow-sm text-stone-600 text-sm font-medium"
             >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {t('badge')}
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="text-[clamp(2.25rem,10vw,3.25rem)] sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-bold tracking-tighter leading-[0.9] text-stone-900"
            >
              {t.rich('hero.heading', {
                br: () => <br />,
                strong: (chunks) => <span className="font-display font-black">{chunks}</span>,
                muted: (chunks) => (
                  <span className={`font-display font-light text-stone-600 ${isArabic ? "block mt-2" : ""}`}>
                    {chunks}
                  </span>
                ),
                nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
                serif: (chunks) => <span className="font-serif italic font-light text-stone-800">{chunks}</span>,
              })}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl text-stone-500 leading-relaxed max-w-lg font-light"
            >
              {t('description')}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Link
                href="/wizard"
                className="bg-stone-900 text-white px-10 py-4 rounded-full font-medium shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg cursor-pointer"
              >
                <span>{t('cta_create')}</span>
                {isArabic ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
              </Link>
            </motion.div>
          </div>

          {/* Right Content - Phone Showcase */}
          <div className="relative flex justify-center lg:justify-end perspective-1000 mt-12 lg:mt-0 min-w-0">
             {/* Abstract Background Shapes */}
             <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
               transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-purple-100/40 rounded-full blur-[100px] -z-10"
             />
             
             {/* Phone Container with Tilt */}
             <motion.div 
               initial={{ opacity: 0, rotate: -15, scale: 0.8, y: 50 }}
               animate={{ opacity: 1, rotate: -6, scale: 1, y: 0 }}
               transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 50 }}
               className="relative transform hover:rotate-0 transition-transform duration-700 ease-out z-20 scale-90 lg:scale-90 xl:scale-100"
             >
                <InvitePreview 
                  date={t('phone_mockup.time') + ", " + t('phone_mockup.today')}
                  locationName={t('phone_mockup.location_name')}
                  message={t('phone_mockup.invite_body')}
                  imageUrl="/images/sample_invite.jpeg"
                />
                
                {/* Floating Elements/Cards around phone */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="absolute -right-8 top-20 bg-white p-4 rounded-2xl shadow-xl shadow-purple-900/5 hidden xl:block z-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <Send size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">Status</div>
                      <div className="font-bold text-sm">Sent via WhatsApp</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  className="absolute -left-8 bottom-32 bg-white p-4 rounded-2xl shadow-xl shadow-purple-900/5 hidden xl:block z-60"
                >
                   <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">Guests</div>
                      <div className="font-bold text-sm">150+ Confirmed</div>
                    </div>
                  </div>
                </motion.div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* Stats & Feature Showcase Section */}
      <section ref={containerRef} className="py-20 bg-[#FDFCF8]">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, staggerChildren: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center mb-20"
          >
            {[
              { val: t('stats.invites_sent').split(' ')[0], label: t('stats.invites_sent').split(' ').slice(1).join(' ') },
              { val: t('stats.happy_guests').split(' ')[0], label: t('stats.happy_guests').split(' ').slice(1).join(' ') },
              { val: t('stats.app_rating').split(' ')[0], label: t('stats.app_rating').split(' ').slice(1).join(' ') }
            ].map((stat, idx) => (
              <motion.div key={idx} className="space-y-1">
                 <h3 className="text-6xl lg:text-7xl font-display font-bold text-stone-900 tracking-tighter">{stat.val}</h3>
                 <p className="text-stone-500 text-lg uppercase tracking-widest font-light">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature Showcase Card */}
          <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-stone-200/50 overflow-hidden relative min-h-[600px] flex flex-col md:flex-row items-center gap-12">
             
             {/* Left Content */}
             <motion.div 
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
               className="flex-1 space-y-8 relative z-10 text-center md:text-start"
             >
               <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-stone-900 leading-[0.9] uppercase">
                 {t('feature_showcase.title')}
               </h2>
               <p className="text-2xl text-stone-500 font-light italic font-serif">
                 {t('feature_showcase.subtitle')}
               </p>
               <motion.a
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 href="#how-it-works"
                 className="px-8 py-4 rounded-full border-2 border-stone-900 text-stone-900 font-medium hover:bg-stone-900 hover:text-white transition-colors text-lg cursor-pointer"
               >
                 {t('feature_showcase.cta')}
               </motion.a>
             </motion.div>

             {/* Right Content - Live Dashboard Demo */}
             <div className="flex-1 relative w-full h-[500px] flex items-center justify-center md:justify-end perspective-1000">
                {/* Abstract Line Background */}
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] -z-10 opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                   <path d="M0 50 Q 25 80 50 50 T 100 50" stroke="#F3E8FF" strokeWidth="20" fill="none" />
                </svg>

                <motion.div 
                  initial={{ y: 50, opacity: 0, rotateY: -5 }}
                  whileInView={{ y: 0, opacity: 1, rotateY: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative w-full max-w-md z-20 transform hover:scale-[1.02] transition-transform duration-500"
                >
                   <LiveDashboardDemo />
                   
                   {/* Decorative floating elements */}
                   <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -right-4 -top-6 bg-white p-3 rounded-2xl shadow-lg hidden md:block border border-stone-100"
                   >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Live Updates</span>
                      </div>
                   </motion.div>
                </motion.div>
             </div>
          </div>

        </div>
      </section>

      {/* How it Works - Story Slider */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto">
         <motion.div 
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="text-center mb-16"
         >
            <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-stone-900 uppercase leading-[0.9] mb-4">
              {isArabic ? "كيف يعمل؟" : "How It Works"}
            </h2>
            <p className="text-xl text-stone-500 font-medium">
               {t('how_it_works.subtitle')}
            </p>
         </motion.div>
         
         <StorySlider />
      </section>

      {/* Why Choose Us - Features */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col lg:flex-row justify-between items-start mb-20 gap-12"
        >
          <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-stone-900 uppercase leading-[0.9] max-w-3xl">
             {t.rich('why_choose_us.title', {break: () => <br/>})}
          </h2>
          
          <div className="lg:text-right max-w-xs lg:self-end">
             <p className="text-xl font-medium text-stone-800 uppercase leading-tight mb-3">
                {t('why_choose_us.subtitle_header')}
             </p>
             <p className="text-sm text-stone-500">
                {t('why_choose_us.subtitle_desc')}
             </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
           {/* Card 1 */}
           <motion.div 
             initial={{ opacity: 0, y: 50 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: 0.1 }}
             whileHover={{ y: -10 }}
             className="bg-[#E9E4F9] rounded-[2.5rem] p-10 min-h-[480px] flex flex-col justify-between group"
           >
              <div className="w-16 h-16 rounded-full border border-stone-900 flex items-center justify-center text-stone-900">
                 <Smartphone size={28} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-3xl font-display font-bold uppercase leading-[0.95] tracking-tight text-stone-900">{t('why_choose_us.simple_interface.title')}</h3>
                 <p className="text-stone-700 font-medium leading-relaxed">{t('why_choose_us.simple_interface.desc')}</p>
              </div>
           </motion.div>

           {/* Card 2 */}
           <motion.div 
             initial={{ opacity: 0, y: 50 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: 0.2 }}
             whileHover={{ y: -10 }}
             className="bg-white rounded-[2.5rem] p-10 min-h-[480px] flex flex-col justify-between group relative overflow-hidden"
           >
               {/* Background Curve */}
               <svg className="absolute inset-0 w-full h-full text-stone-100 pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
                 <path d="M400 0 C 400 200 200 200 200 300 C 200 400 300 500 300 600" stroke="currentColor" strokeWidth="80" fill="none" className="opacity-60" />
               </svg>

              <div className="w-16 h-16 rounded-full border border-stone-900 flex items-center justify-center text-stone-900 relative z-10">
                 <Zap size={28} strokeWidth={1.5} />
              </div>
              <div className="space-y-4 relative z-10">
                 <h3 className="text-3xl font-display font-bold uppercase leading-[0.95] tracking-tight text-stone-900">{t('why_choose_us.free_access.title')}</h3>
                 <p className="text-stone-700 font-medium leading-relaxed">{t('why_choose_us.free_access.desc')}</p>
              </div>
           </motion.div>

           {/* Card 3 */}
           <motion.div 
             initial={{ opacity: 0, y: 50 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: 0.3 }}
             whileHover={{ y: -10 }}
             className="bg-[#E3E8C9] rounded-[2.5rem] p-10 min-h-[480px] flex flex-col justify-between group"
           >
              <div className="w-16 h-16 rounded-full border border-stone-900 flex items-center justify-center text-stone-900">
                 <Palette size={28} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-3xl font-display font-bold uppercase leading-[0.95] tracking-tight text-stone-900">{t('why_choose_us.beautiful_designs.title')}</h3>
                 <p className="text-stone-700 font-medium leading-relaxed">{t('why_choose_us.beautiful_designs.desc')}</p>
              </div>
           </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
         {/* Abstract background blobs for Pricing */}
         <motion.div 
           animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
           transition={{ duration: 10, repeat: Infinity }}
           className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-purple-200/40 rounded-full blur-[100px] -z-10"
         />
         <motion.div 
           animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
           transition={{ duration: 12, repeat: Infinity, delay: 1 }}
           className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-200/40 rounded-full blur-[80px] -z-10"
         />

         <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16 space-y-4"
            >
               <h2 className="text-5xl font-display font-bold tracking-tighter text-stone-900 uppercase">{t('pricing.title')}</h2>
               <p className="text-xl text-stone-500 max-w-xl mx-auto">{t('pricing.subtitle')}</p>
            </motion.div>

            <div className="grid md:grid-cols-5 gap-6 items-stretch">
               {/* Standard Plan - Wider & Dark/Premium */}
               <motion.div 
                 initial={{ opacity: 0, x: -50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
                 whileHover={{ y: -5 }}
                 className="md:col-span-3 bg-[#1C1917] text-white rounded-[3rem] p-10 shadow-2xl shadow-stone-900/20 relative overflow-hidden flex flex-col group"
               >
                 {/* Subtle noise/gradient texture */}
                 <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -z-10"></div>
                  
                  <div className="mb-8 relative z-10">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-300 text-[10px] font-bold uppercase tracking-wider mb-4">
                        <Sparkles size={12} className="text-amber-400" />
                        Most Popular
                     </div>
                     <h3 className="text-3xl font-display font-bold uppercase tracking-tight mb-2">{t('pricing.standard.title')}</h3>
                     <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-black tracking-tighter text-white">{t('pricing.standard.price')}</span>
                     </div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1 relative z-10">
                     {['Unlimited Guests', 'WhatsApp Automation', 'RSVP Tracking', 'Location Map', 'Custom Design'].map((item, i) => (
                        <motion.li 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 + (i * 0.1) }}
                          className="flex items-center gap-3 text-stone-300 font-medium"
                        >
                           <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white shrink-0 border border-stone-700">
                              <Check size={14} strokeWidth={3} />
                           </div>
                           <span>{t(`pricing.standard.features.${i}`)}</span>
                        </motion.li>
                     ))}
                  </ul>

                  <Link
                    href="/wizard"
                    className="relative z-10 w-full block text-center bg-white text-stone-900 py-5 rounded-2xl font-bold text-lg uppercase tracking-wide hover:bg-stone-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
                  >
                     {t('pricing.standard.cta')}
                  </Link>
               </motion.div>

               {/* QR Add-on - Narrower & Light/Clean */}
               <motion.div 
                 initial={{ opacity: 0, x: 50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ type: "spring", stiffness: 50, delay: 0.4 }}
                 whileHover={{ y: -5 }}
                 className="md:col-span-2 bg-white rounded-[3rem] p-10 flex flex-col relative overflow-hidden border border-stone-100 shadow-xl shadow-stone-200/50 group"
               >
                  <motion.div 
                    animate={{ rotate: [5, 10, 5] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-8 -top-8 text-stone-50 group-hover:text-amber-50 transition-colors duration-500"
                  >
                     <QrCode size={200} strokeWidth={1.5} />
                  </motion.div>

                  <div className="relative z-10 mb-8">
                     <div className="inline-block bg-amber-100 px-3 py-1 rounded-full text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-4 border border-amber-200">
                       Add-on
                     </div>
                     <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-stone-900">{t('pricing.plus.title')}</h3>
                     <div className="text-4xl font-black text-stone-900 tracking-tighter mt-2">{t('pricing.plus.price')}</div>
                     <p className="text-sm text-stone-500 font-medium mt-3 leading-relaxed">{t('pricing.plus.desc')}</p>
                  </div>

                  <ul className="space-y-4 relative z-10">
                     {['Unique QR per guest', 'Scanner App', 'Real-time stats', 'Entry validation'].map((item, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 + (i * 0.1) }}
                          className="flex items-center gap-3 text-stone-600 text-sm font-medium"
                        >
                           <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-900 shrink-0">
                              <Check size={12} strokeWidth={3} />
                           </div>
                           <span>{t(`pricing.plus.features.${i}`)}</span>
                        </motion.li>
                     ))}
                  </ul>
               </motion.div>
            </div>
         </div>
      </section>

      {/* Community / Final CTA */}
      <section id="contact" className="py-24 px-6">
         <motion.div 
           initial={{ scale: 0.9, opacity: 0 }}
           whileInView={{ scale: 1, opacity: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="max-w-5xl mx-auto bg-stone-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden"
         >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
               </svg>
            </div>
            
            <div className="relative z-10 space-y-8">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl md:text-7xl font-display font-bold text-white tracking-tighter"
              >
                {t('community.title')}
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-stone-400 text-xl max-w-2xl mx-auto"
              >
                {t('community.subtitle')}
              </motion.p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                 <Link href="/wizard" className="bg-white text-stone-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-stone-100 transition-colors cursor-pointer">
                    {t('community.cta_download')}
                 </Link>
              </div>
            </div>
         </motion.div>
      </section>

    </div>
  );
}
