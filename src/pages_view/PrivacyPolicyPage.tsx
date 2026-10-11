import React from 'react';
import { Link } from 'wouter';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, UserCheck, Calendar, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          კონფიდენციალურობის პოლიტიკა
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          ბიზნესისა და ტექნოლოგიების აკადემიის (BTA) საშინაო დავალებების პორტალის კონფიდენციალურობის პოლიტიკა განსაზღვრავს პერსონალურ მონაცემთა დამუშავების, შენახვისა და დაცვის წესებს საქართველოს მოქმედი კანონმდებლობის შესაბამისად.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">

        {/* 1. მარეგულირებელი ჩარჩო */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              ზოგადი დებულებები და პერსონალურ მონაცემთა დაცვის კანონმდებლობა
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              წინამდებარე დოკუმენტი შემუშავებულია <strong>"პერსონალურ მონაცემთა დაცვის შესახებ" საქართველოს კანონის</strong> მოთხოვნათა სრული დაცვით.
            </p>
            <p>
              პლატფორმაზე რეგისტრაციითა და ავტორიზაციით მოსწავლეები, მასწავლებლები და ადმინისტრატორები ეთანხმებიან წინამდებარე პოლიტიკით გათვალისწინებულ პირობებს. BTA უზრუნველყოფს მონაცემთა დამუშავების კანონიერებას, გამჭვირვალობას, სამართლიანობასა და უსაფრთხოებას.
            </p>
          </div>
        </section>

        {/* 2. შეგროვებული ინფორმაცია */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              შეგროვებული ინფორმაცია და მონაცემთა კატეგორიები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              სასწავლო პროცესის სრულყოფილად წარმართვისათვის BTA Homeworks აგროვებს და ამუშავებს შემდეგი კატეგორიის მონაცემებს:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>საიდენტიფიკაციო მონაცემები:</strong> მომხმარებლის სახელი, გვარი, ელექტრონული ფოსტის მისამართი და საკონტაქტო ტელეფონის ნომერი.</li>
              <li><strong>აკადემიური სტატუსი:</strong> მომხმარებლის როლი სისტემაში (მოსწავლე, მასწავლებელი, ადმინისტრატორი), კლასი/ჯგუფი და შესაბამისი სასწავლო საგნები.</li>
              <li><strong>სასწავლო მასალები და ნაშრომები:</strong> ატვირთული საშინაო დავალებების ფაილები (PDF, Word, სურათები), გარე ბმულები (Google Docs, Google Drive), კომენტარები და ჩაბარების თარიღები.</li>
              <li><strong>შეფასების მონაცემები:</strong> მასწავლებლის მიერ დაწერილი ქულები (1-10 შკალით), უკუკავშირი და განხილვის თარიღი.</li>
              <li><strong>ტექნიკური ლოგები:</strong> ავტორიზაციის დრო, სისტემური შეცდომების ლოგები და უსაფრთხოების აუდიტის ჩანაწერები.</li>
            </ul>
          </div>
        </section>

        {/* 3. დამუშავების მიზნები */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              მონაცემთა დამუშავების მიზნები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              პერსონალური მონაცემების შეგროვება ხორციელდება მკაცრად განსაზღვრული აკადემიური და ორგანიზაციული მიზნებისათვის:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li>სასწავლო პროცესის, საშინაო დავალებების გაცემისა და მიღების ციფრული ორგანიზება;</li>
              <li>მოსწავლეთა აკადემიური მოსწრების აღრიცხვა, შეფასება და პედაგოგიური უკუკავშირის მიწოდება;</li>
              <li>სისტემის უსაფრთხოების უზრუნველყოფა და არაავტორიზებული წვდომის აღკვეთა;</li>
              <li>სასწავლო პორტალის ფუნქციონალის გაუმჯობესება და ტექნიკური გამართულობის მონიტორინგი.</li>
            </ul>
          </div>
        </section>

        {/* 4. მონაცემთა უსაფრთხოება */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              მონაცემთა უსაფრთხოება და ტექნიკური დაცვის ზომები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              აკადემია იყენებს თანამედროვე ტექნოლოგიურ და ორგანიზაციულ მექანიზმებს მონაცემთა უსაფრთხოების უმაღლესი დონის დასაცავად:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>მონაცემთა ბაზის Row Level Security (RLS):</strong> მონაცემებზე წვდომა მკაცრად იზოლირებულია მომხმარებლის როლისა და საგნობრივი მიკუთვნებულობის მიხედვით;</li>
              <li><strong>დაშიფრული კავშირი (HTTPS / TLS):</strong> ყველა მოთხოვნა და მონაცემი გადაიცემა დაცული, შიფრირებული პროტოკოლებით;</li>
              <li><strong>დაცული ფაილსაცავი:</strong> ატვირთული ფაილები ინახება იზოლირებულ საცავში დროებითი ხელმოწერილი ბმულებით (Signed URLs), რაც გამორიცხავს უნებართვო საჯარო წვდომას.</li>
            </ul>
          </div>
        </section>

        {/* 5. შენახვის ვადა */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              მონაცემთა შენახვის ვადა
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              პერსონალური მონაცემები ინახება მხოლოდ იმ ვადით, რაც აუცილებელია სასწავლო მიზნების მისაღწევად ან კანონმდებლობით განსაზღვრული მოთხოვნების დასაკმაყოფილებლად:
            </p>
            <p>
              მიმდინარე სასწავლო წლის დასრულების შემდეგ, მონაცემები არქივდება ან იშლება აკადემიის შიდა დებულებისა და "პერსონალურ მონაცემთა დაცვის შესახებ" საქართველოს კანონის დაცვით. მომხმარებლის ანგარიშის გაუქმებისას მისი პერსონალური პროფილი და ატვირთული მასალები იშლება ან ანონიმიზირდება.
            </p>
          </div>
        </section>

        {/* 6. მომხმარებლის უფლებები */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              6
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              მომხმარებლის უფლებები
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              საქართველოს კანონმდებლობის შესაბამისად, მონაცემთა სუბიექტს (მოსწავლეს, მშობელს, მასწავლებელს) გააჩნია შემდეგი უფლებები:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>ინფორმაციის მიღების უფლება:</strong> გაეცნოს მის შესახებ დამუშავებულ მონაცემებს და დამუშავების სამართლებრივ საფუძველს;</li>
              <li><strong>მონაცემთა გასწორების უფლება:</strong> მოითხოვოს არასწორი, არაზუსტი ან არასრული მონაცემების გასწორება ან განახლება;</li>
              <li><strong>მონაცემთა წაშლის უფლება:</strong> მოითხოვოს მონაცემთა დამუშავების შეწყვეტა ან წაშლა, თუ ამოიწურა მათი შენახვის კანონიერი საფუძველი;</li>
              <li><strong>გასაჩივრების უფლება:</strong> მიმართოს პერსონალურ მონაცემთა დაცვის სამსახურს ან სასამართლოს უფლებების დარღვევის შემთხვევაში.</li>
            </ul>
          </div>
        </section>

        {/* 7. საკონტაქტო ინფორმაცია */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              7
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              საკონტაქტო ინფორმაცია
            </h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-0 sm:pl-12">
            <p>
              კონფიდენციალურობის პოლიტიკასთან ან პერსონალურ მონაცემებთან დაკავშირებული ნებისმიერი შეკითხვის შემთხვევაში, გთხოვთ დაუკავშირდეთ BTA-ს ადმინისტრაციას:
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
