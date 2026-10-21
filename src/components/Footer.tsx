import React from 'react';
import { Link } from 'wouter';
import BtaLogo from './BtaLogo';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#111827] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-8">

        {/* Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <BtaLogo size={38} />
              <div>
                <div className="text-[21px] font-extrabold tracking-tight leading-none">BTA</div>
                <div className="text-[11px] text-gray-500 dark:text-slate-400 tracking-widest uppercase mt-1">სასწავლო პორტალი</div>
              </div>
            </div>
            <p className="text-[13px] text-gray-400 dark:text-slate-500 leading-relaxed max-w-xs">
              ბიზნესისა და ტექნოლოგიების აკადემიის სასწავლო პლატფორმა — სტუდენტების, მასწავლებლებისა და ადმინისტრაციისთვის.
            </p>
            <a
              href="https://bta.edu.ge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#2B4EFF] hover:text-blue-400 font-medium transition-colors"
            >
              bta.edu.ge
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">ბმულები</h4>
            <ul className="space-y-3">
              {[
                { label: 'BTA ოფიციალური', href: 'https://bta.edu.ge' },
                { label: 'ბიბლიოთეკა', href: 'https://library.bta.edu.ge/' },
                { label: 'სასწავლო საწარმო', href: 'https://wds.ge/' },
                { label: 'სამეცნიერო ჟურნალი', href: 'https://bta.edu.ge/ge/journals' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                    className="text-[13px] text-gray-400 dark:text-slate-500 hover:text-white dark:hover:text-white transition-colors flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-[#2B4EFF] transition-colors" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal links */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">პორტალი</h4>
            <ul className="space-y-3">
              {[
                { label: 'მთავარი', href: '/' },
                { label: 'სისტემაში შესვლა', href: '/login' },
                { label: 'კონფიდენციალურობის პოლიტიკა', href: '/privacy' },
                { label: 'გამოყენების წესები', href: '/terms' },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href}
                    className="text-[13px] text-gray-400 dark:text-slate-500 hover:text-white dark:hover:text-white transition-colors flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-[#2B4EFF] transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-gray-600 dark:text-slate-400">
            © {year} BTA — ბიზნესისა და ტექნოლოგიების აკადემია
          </p>
          <p className="text-[12px] text-gray-600 dark:text-slate-400">
            შექმნილია BTA-ს სტუდენტის მიერ
          </p>
        </div>
      </div>
    </footer>
  );
}
