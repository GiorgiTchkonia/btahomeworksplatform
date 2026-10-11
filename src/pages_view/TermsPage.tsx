import React from 'react';
import { Link } from 'wouter';
import { BookOpen, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Copyright, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          მთავარ გვერდზე დაბრუნება
        </Link>

        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          ბოლო განახლება: 2026 წლის ოქტომბერი
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Scale className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          პლატფორმის გამოყენების წესები
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          ბიზნესისა და ტექნოლოგიების აკადემიის (BTA) საშინაო დავალებების პორტალით სარგებლობის წესები და პირობები.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">

        {/* 1. ზოგადი დებულებები */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              ზოგადი გამოყენების წესები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              წინამდებარე <strong>გამოყენების წესები</strong> არეგულირებს BTA Homeworks პორტალით სარგებლობის პირობებს მოსწავლეების, პედაგოგებისა და ადმინისტრაციული პერსონალის მიერ.
            </p>
            <p>
              პლატფორმა შექმნილია ექსკლუზიურად საგანმანათლებლო მიზნებისათვის და მისი გამოყენება ნებადართულია მხოლოდ აკადემიის მიერ ავტორიზებული პირებისათვის.
            </p>
          </div>
        </section>

        {/* 2. აკადემიური კეთილსინდისიერება */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              აკადემიური კეთილსინდისიერება
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              <strong>აკადემიური კეთილსინდისიერება</strong> წარმოადგენს BTA-ს საგანმანათლებლო ფასეულობათა ფუნდამენტურ პრინციპს:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li>მოსწავლე ვალდებულია ყველა საშინაო დავალება შეასრულოს დამოუკიდებლად და კეთილსინდისიერად;</li>
              <li>დაუშვებელია პლაგიატი, სხვისი ნაშრომის მითვისება ან სხვა პირის დახმარებით დავალების გაყალბება;</li>
              <li>სხვისი ინტელექტუალური წყაროების გამოყენებისას სავალდებულოა ავტორის და წყაროს მითითება;</li>
              <li>აკადემიური კეთილსინდისიერების დარღვევის აღმოჩენის შემთხვევაში, პედაგოგი უფლებამოსილია უარყოს ნაშრომი და შეაფასოს იგი მინიმალური ქულით.</li>
            </ul>
          </div>
        </section>

        {/* 3. მომხმარებლის პასუხისმგებლობა */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              მომხმარებლის პასუხისმგებლობა
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              პლატფორმის თითოეული მომხმარებელი იღებს სრულ პასუხისმგებლობას თავის ქმედებებზე:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>მომხმარებლის პასუხისმგებლობა</strong> მოიცავს საკუთარი ავტორიზაციის მონაცემების (ელფოსტა, პაროლი) საიდუმლოდ შენახვას;</li>
              <li>დაუშვებელია საკუთარი ანგარიშის გადაცემა მესამე პირებისათვის ან სხვისი ანგარიშით ავტორიზაცია;</li>
              <li>მომხმარებელს ეკრძალება სისტემაში მავნე პროგრამული კოდის, ვირუსების ან დაუმოწმებელი ფაილების ატვირთვა;</li>
              <li>აკრძალულია პლატფორმის ფუნქციონირების ხელოვნური შეფერხება, ავტომატიზებული სკრიპტების გამოყენება ან უსაფრთხოების მექანიზმების გვერდის ავლა.</li>
            </ul>
          </div>
        </section>

        {/* 4. საავტორო უფლებები */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              საავტორო უფლებები და ინტელექტუალური საკუთრება
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              ყველა უფლება დაცულია საქართველოს საავტორო და მომიჯნავე უფლებების შესახებ კანონმდებლობით:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>საავტორო უფლებები</strong> პლატფორმის დიზაინზე, კოდზე, ლოგოსა და სტრუქტურაზე ეკუთვნის ბიზნესისა და ტექნოლოგიების აკადემიას;</li>
              <li>მასწავლებლების მიერ ატვირთული სასწავლო მასალები და დავალებები წარმოადგენს აკადემიური პერსონალის ინტელექტუალურ საკუთრებას;</li>
              <li>დაუშვებელია სასწავლო მასალების უნებართვო კოპირება, გავრცელება, კომერციული მიზნით გამოყენება ან საჯარო ინტერნეტ-სივრცეში განთავსება აკადემიის წერილობითი თანხმობის გარეშე.</li>
            </ul>
          </div>
        </section>

        {/* 5. წესების ცვლილება */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              წესების განახლება და ცვლილებები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              BTA იტოვებს უფლებას, პერიოდულად განაახლოს წინამდებარე გამოყენების წესები საგანმანათლებლო პროცესის ან კანონმდებლობის ცვლილების შესაბამისად.
            </p>
            <p>
              განახლებული წესები ძალაში შედის პორტალზე გამოქვეყნებისთანავე. მომხმარებლის მიერ პლატფორმით სარგებლობის გაგრძელება ნიშნავს განახლებულ წესებთან სრულ დათმობას.
            </p>
          </div>
        </section>

        {/* 6. საკონტაქტო ინფორმაცია */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              6
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              კონტაქტი
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              წესებთან ან პლატფორმის ფუნქციონირებასთან დაკავშირებული საკითხებისათვის დაგვიკავშირდით:
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold space-y-1">
              <p>🏢 ბიზნესისა და ტექნოლოგიების აკადემია (BTA)</p>
              <p>🌐 ოფიციალური ვებგვერდი: <a href="https://bta.edu.ge" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">bta.edu.ge</a></p>
              <p>✉️ ელ. ფოსტა: info@bta.edu.ge</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
