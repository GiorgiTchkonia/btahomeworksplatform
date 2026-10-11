import React, { useEffect } from 'react';
import { Link } from 'wouter';
import {
  BookOpen, Shield, Users, ArrowRight, GraduationCap,
  BarChart3, Clock, ChevronRight, CheckCircle,
  Sparkles, CalendarDays
} from 'lucide-react';

/* ─── Scroll reveal (fires once per element for the 2 target sections) ─── */
function useReveal() {
  useEffect(() => {
    const run = () => {
      const els = document.querySelectorAll<HTMLElement>('.rv, .rv-l, .rv-r');
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      els.forEach((el) => obs.observe(el));
      return obs;
    };
    const obs = run();
    return () => obs.disconnect();
  }, []);
}

/* ─── Reliable image helper (with fallback bg) ─── */
function Img({
  src, alt, className = '', style,
}: {
  src: string; alt: string; className?: string; style?: React.CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className={className}
      style={style}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
      loading="lazy"
    />
  );
}

/* ─── Data ─── */
const FEATURES = [
  { icon: BookOpen, title: 'დავალებების ატვირთვა', desc: 'მასწავლებელი ქმნის დავალებას, ნიშნავს ვადას. მოსწავლე ჩააბარებს ფაილს — ფოსტა და Messenger საჭირო აღარ არის.' },
  { icon: BarChart3, title: 'ქულები და შეფასება', desc: 'ყველა ჩაბარებული სამუშაო ჩანს ერთ სიაში. მასწავლებელი ადვილად ადევნებს თვალს ვინ ჩააბარა, ვინ — არა.' },
  { icon: Clock, title: 'ვადების კონტროლი', desc: 'deadline-ების მართვა სისტემაში. ყველა ვიცით — ბოლო ვადა ყველაზე მნიშვნელოვანია.' },
  { icon: Shield, title: 'სამი დონის წვდომა', desc: 'მოსწავლე, მასწავლებელი, ადმინი — ყველა ხედავს მხოლოდ იმ ინფორმაციას, რაც მისი ფუნქციაა.' },
  { icon: Users, title: 'ჯგუფების მართვა', desc: 'ადმინი ადგენს ჯგუფებს, ნიშნავს მასწავლებლებს და ახდენს ყველა საქმიანობის მონიტორინგს.' },
  { icon: CalendarDays, title: 'სრულიად ქართული', desc: 'ინტერფეისი, ფუნქციები და ყველა ტექსტი — ქართულ ენაზე, BTA-ს ყოველდღიური გამოყენებისთვის.' },
];

const ROLES = [
  { icon: GraduationCap, role: 'მოსწავლე', bg: 'bg-[#2B4EFF]', steps: ['ნახე შენი ჯგუფის დავალებები', 'ჩააბარე ნამუშევარი ვადამდე', 'ნახე ქულები და შეფასება'] },
  { icon: BookOpen, role: 'მასწავლებელი', bg: 'bg-teal-600', steps: ['შექმენი დავალება, ჩასვი ვადა', 'ნახე ჩაბარებული ნამუშევრები', 'შეაფასე და დაუდე ქულა'] },
  { icon: Shield, role: 'ადმინი', bg: 'bg-violet-600', steps: ['მართე მომხმარებლები და ჯგუფები', 'გაანაწილე მასწავლებლები', 'ნახე სრული ანალიტიკა'] },
];

/* ─── Unsplash direct ─── */
const PHOTOS = {
  hero:      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=920&q=80&fit=crop',
  classroom: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=75&fit=crop',
  study1:    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=75&fit=crop',
  study2:    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&q=75&fit=crop',
  study3:    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&q=75&fit=crop',
};

export default function DocumentationPage() {
  useReveal();

  return (
    <div className="w-full">

      {/* ════════════════════════════════════════
          HERO (Untouched, completely static)
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#F9FAFB] dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 transition-colors duration-350">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Colour accent — top right */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-[#2B4EFF]/5 dark:bg-[#2B4EFF]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-10 lg:gap-16 items-center">

            {/* Left text */}
            <div className="space-y-7 order-2 lg:order-1">
              {/* Eyebrow pill */}
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2B4EFF]/8 dark:bg-[#2B4EFF]/15 border border-[#2B4EFF]/15 dark:border-[#2B4EFF]/25 text-[#2B4EFF] dark:text-blue-400 text-[12px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                ბიზნესისა და ტექნოლოგიების აკადემია
              </span>

              {/* Headline */}
              <h1 className="text-[38px] sm:text-[52px] lg:text-[62px] font-black text-[#111827] dark:text-white leading-[1.05] tracking-tight">
                BTA სასწავლო<br />
                <span className="text-[#2B4EFF]">პორტალი</span>
              </h1>

              <p className="text-[15px] sm:text-[17px] text-gray-500 dark:text-slate-300 leading-relaxed max-w-[480px]">
                ერთი სივრცე — მოსწავლეებისთვის, მასწავლებლებისა და ადმინისტრაციისთვის.
                დავალებები, ჩაბარება, შეფასება — ყველაფერი ციფრულად, ქართულ ენაზე.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-white bg-[#2B4EFF] hover:bg-[#1a35d9] rounded-xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.97]"
                >
                  სისტემაში შესვლა
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://bta.edu.ge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                >
                  BTA ვებ-გვერდი
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                </a>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-8 pt-6 border-t border-gray-200 dark:border-slate-800">
                {[
                  { val: '30+', label: 'წლიანი გამოცდილება' },
                  { val: '3', label: 'მომხმარებლის როლი' },
                  { val: '100%', label: 'ქართულ ენაზე' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[26px] font-black text-[#111827] dark:text-white leading-none">{s.val}</div>
                    <div className="text-[12px] text-gray-400 dark:text-slate-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right photo */}
            <div className="relative order-1 lg:order-2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-gray-300/40 dark:shadow-black/50 bg-gray-100 dark:bg-slate-800" style={{ aspectRatio: '4/3' }}>
                <Img
                  src={PHOTOS.hero}
                  alt="BTA სტუდენტები სწავლობენ"
                  className="w-full h-full object-cover"
                  style={{ position: 'absolute', inset: 0 }}
                />
                {/* Caption strip */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4 pointer-events-none">
                  <p className="text-white text-[12px] font-medium">BTA-ს სტუდენტები</p>
                </div>
              </div>

              {/* Floating badge */}
              <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-3.5 items-center gap-3 z-10">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800 dark:text-white leading-tight">ციფრული პლატფორმა</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400">ნებისმიერი მოწყობილობიდან</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          ABOUT THE PLATFORM (Untouched, completely static)
      ════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 transition-colors duration-350">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Photo (Static, no hover movement) */}
            <div>
              <div className="rounded-2xl overflow-hidden shadow-xl shadow-gray-200/60 dark:shadow-black/40 bg-gray-100 dark:bg-slate-800" style={{ aspectRatio: '3/2' }}>
                <Img src={PHOTOS.classroom} alt="BTA კლასი" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Text (Static, no hover movement) */}
            <div className="space-y-5">
              <p className="text-[11px] font-bold text-[#2B4EFF] dark:text-blue-400 uppercase tracking-widest">პლატფორმის შესახებ</p>
              <h2 className="text-[28px] sm:text-[36px] font-black text-[#111827] dark:text-white leading-tight tracking-tight">
                ყველაფერი ერთ ადგილას
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-slate-300 leading-relaxed">
                BTA-ს სასწავლო პორტალი შეიქმნა სასწავლო პროცესის გასამარტივებლად. ნაცვლად ელ-ფოსტისა, Messenger-ისა და ქაღალდისა — სტრუქტურირებული, ნათელი სისტემა.
              </p>
              <ul className="space-y-3">
                {[
                  'დავალებების გამოქვეყნება ვადებით',
                  'ფაილების ჩაბარება პირდაპირ სისტემაში',
                  'ქულების ნახვა და შეფასება',
                  'ადმინის მიერ მომხმარებლების სრული მართვა',
                ].map((it) => (
                  <li key={it} className="flex items-start gap-3 text-[14px] text-gray-600 dark:text-slate-300">
                    <CheckCircle className="w-4 h-4 text-[#2B4EFF] dark:text-blue-400 mt-0.5 shrink-0" strokeWidth={2} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURES (Animated on scroll + Card hover)
      ════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#F9FAFB] dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800 transition-colors duration-350">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Static Title (No hover shift) */}
          <div className="mb-12">
            <p className="text-[11px] font-bold text-[#2B4EFF] dark:text-blue-400 uppercase tracking-widest mb-3">ფუნქციები</p>
            <h2 className="text-[28px] sm:text-[36px] font-black text-[#111827] dark:text-white leading-tight tracking-tight">
              რას სთავაზობს პლატფორმა?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              // Directional entrances: Left, Bottom, Right
              const entrances = [
                'rv-l',
                'rv delay-150',
                'rv-r delay-300',
                'rv-l delay-200',
                'rv delay-350',
                'rv-r delay-500',
              ];
              const entrance = entrances[i] || 'rv';
              return (
                <div key={f.title} className={`${entrance} group h-full`}>
                  <div className="card-box bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700/80 cursor-default h-full">
                    <div className="w-11 h-11 rounded-xl bg-[#2B4EFF]/8 dark:bg-[#2B4EFF]/15 flex items-center justify-center mb-5 text-[#2B4EFF] dark:text-blue-400">
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#111827] dark:text-white mb-2">{f.title}</h3>
                    <p className="text-[13px] text-gray-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          ROLES (Animated on scroll + Card hover)
      ════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 transition-colors duration-350">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Static Title (No hover shift) */}
          <div className="text-center max-w-lg mx-auto mb-12">
            <p className="text-[11px] font-bold text-[#2B4EFF] dark:text-blue-400 uppercase tracking-widest mb-3">ვინ ვიყენებთ?</p>
            <h2 className="text-[28px] sm:text-[36px] font-black text-[#111827] dark:text-white leading-tight tracking-tight">
              სამი როლი
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {ROLES.map((r, i) => {
              const Icon = r.icon;
              // Directional entrances: Left, Bottom, Right
              const entrances = [
                'rv-l',
                'rv delay-200',
                'rv-r delay-400',
              ];
              const entrance = entrances[i] || 'rv';
              return (
                <div key={r.role} className={`${entrance} group h-full`}>
                  <div className="card-box bg-[#F9FAFB] dark:bg-slate-800 rounded-2xl p-7 border border-gray-100 dark:border-slate-700/80 cursor-default h-full">
                    <div className={`w-12 h-12 rounded-2xl ${r.bg} flex items-center justify-center mb-5 shadow-sm`}>
                      <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[18px] font-black text-[#111827] dark:text-white mb-5">{r.role}</h3>
                    <ol className="space-y-3.5">
                      {r.steps.map((step, j) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[10px] font-bold text-gray-400 dark:text-slate-300 flex items-center justify-center mt-0.5">{j + 1}</span>
                          <span className="text-[13px] text-gray-600 dark:text-slate-300 leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          ABOUT BTA (Untouched, completely static)
      ════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#F9FAFB] dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800 transition-colors duration-350">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Text (Static, no hover movement) */}
            <div className="space-y-5">
              <p className="text-[11px] font-bold text-[#2B4EFF] dark:text-blue-400 uppercase tracking-widest">BTA-ს შესახებ</p>
              <h2 className="text-[28px] sm:text-[36px] font-black text-[#111827] dark:text-white leading-tight tracking-tight">
                30 წელი სამსახურში
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-slate-300 leading-relaxed">
                <strong className="text-gray-700 dark:text-white font-semibold">ბიზნესისა და ტექნოლოგიების აკადემია</strong> — საქართველოს ერთ-ერთი ყველაზე გამოცდილი კოლეჯი. 30 წელზე მეტია ამზადებს სპეციალისტებს ბიზნესსა, ტექნოლოგიებსა, მედიცინასა და ხელოვნებაში.
              </p>
              <p className="text-[15px] text-gray-500 dark:text-slate-300 leading-relaxed">
                ეს სასწავლო პორტალი BTA-ს სტუდენტებმა შექმნეს — ციფრული ეპოქის სასწავლო პროცესისთვის.
              </p>
              <a
                href="https://bta.edu.ge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2B4EFF] dark:text-blue-400 hover:underline underline-offset-4"
              >
                bta.edu.ge-ზე გადასვლა
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  { val: '30+', label: 'წელი' },
                  { val: '20+', label: 'პროგრამა' },
                  { val: '100+', label: 'პედაგოგი' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[16px] font-black text-[#2B4EFF] dark:text-blue-400">{s.val}</span>
                    <span className="text-[12px] text-gray-400 dark:text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo collage (Static, no hover movement) */}
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* col 1 */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-md bg-gray-100 dark:bg-slate-800" style={{ aspectRatio: '1/1' }}>
                    <Img src={PHOTOS.study1} alt="სწავლა" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-md bg-gray-100 dark:bg-slate-800" style={{ aspectRatio: '4/3' }}>
                    <Img src={PHOTOS.study3} alt="წიგნები" className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* col 2 — offset down */}
                <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-10">
                  <div className="rounded-2xl overflow-hidden shadow-md bg-gray-100 dark:bg-slate-800" style={{ aspectRatio: '4/3' }}>
                    <Img src={PHOTOS.study2} alt="ლეპტოპი" className="w-full h-full object-cover" />
                  </div>
                  {/* Accent tile */}
                  <div className="rounded-2xl bg-[#2B4EFF] flex flex-col items-center justify-center shadow-md" style={{ aspectRatio: '1/1' }}>
                    <span className="text-[36px] sm:text-[44px] font-black text-white leading-none">30<sup className="text-[18px] sm:text-[22px]">+</sup></span>
                    <span className="text-white/60 text-[11px] sm:text-[12px] font-medium mt-1 text-center px-2">წელი სამსახურში</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA (Untouched, completely static)
      ════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#111827] dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-[11px] font-bold text-[#2B4EFF] dark:text-blue-400 uppercase tracking-widest mb-4">დაიწყეთ ახლა</p>
              <h2 className="text-[28px] sm:text-[42px] font-black text-white leading-tight tracking-tight mb-3">
                თქვენი ანგარიში<br />
                <span className="text-gray-400 dark:text-slate-400">ელოდება.</span>
              </h2>
              <p className="text-[15px] text-gray-400 dark:text-slate-400 max-w-md leading-relaxed">
                შედით სისტემაში ადმინის მიერ გაცემული ანგარიშით და დაიწყეთ.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-4 text-[14px] font-semibold text-white bg-[#2B4EFF] hover:bg-[#1a35d9] rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.97] whitespace-nowrap"
              >
                სისტემაში შესვლა
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
